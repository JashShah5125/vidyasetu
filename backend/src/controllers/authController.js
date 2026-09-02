const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const tenantModel = require('../models/tenantModel');
const { generateToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken, REFRESH_TTL_SECONDS } = require('../utils/jwt');
const redisClient = require('../config/redis');

const MASTER_TENANT_ID = parseInt(process.env.MASTER_TENANT_ID) || 1;

// Format in server-local time so the DATETIME round-trips through mysql2
// without timezone drift (mysql2 parses DATETIME back into local time).
const toMySqlDatetime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await userModel.findUserById(req.user.userId);
        if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
            return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword(req.user.userId, passwordHash);
        res.status(200).json({ status: 'success', message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to change password' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.userId;

        const existing = await userModel.findUserByEmail(email, req.user.tenantId);
        if (existing && existing.length > 0 && existing[0].id !== userId) {
            return res.status(409).json({ status: 'error', message: 'Email is already in use by another account' });
        }

        await userModel.updateUserProfile(userId, { name, email });
        res.status(200).json({ status: 'success', message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to update profile' });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await userModel.findUserByEmail(email);
        
        if (!users || users.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        if (users.length > 1) {
            // For now, if multiple users share an email, require tenant identification.
            // Since frontend doesn't send tenantId yet, we just block it to prevent IDOR.
            return res.status(400).json({ status: 'error', message: 'Multiple accounts found with this email. Please contact support.' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'Account is not active' });
        }

        // Login resolves identity (users) + role (user_roles) only.
        // Check whether user has at least one active assigned role in user_roles table.
        const roleCodes = await userModel.getUserRoleCodes(user.id);
        if (!roleCodes || roleCodes.length === 0) {
            return res.status(403).json({
                status: 'error',
                message: 'Login failed. No security role assigned to your account. Please contact system administrator.'
            });
        }

        let isSaasAdmin = user.tenant_id === MASTER_TENANT_ID;

        const ROLE_PRIORITY = ['saas_admin', 'inst_admin', 'branch_admin', 'counsellor', 'finance', 'teacher'];
        let effectiveUserType = user.user_type;
        if (isSaasAdmin) {
            effectiveUserType = 'saas_admin';
        } else if (roleCodes.length > 0) {
            for (const role of ROLE_PRIORITY) {
                if (roleCodes.includes(role)) {
                    effectiveUserType = role;
                    break;
                }
            }
        }

        const tokenPayload = {
            userId: user.id,
            tenantId: user.tenant_id,
            userType: effectiveUserType,
            isSaasAdmin
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Resolve the requester's organization/tenant name for display (used by
        // the support ticket "Requester Organization" field and general UI).
        let tenantName = null;
        if (!isSaasAdmin && user.tenant_id) {
            const tenant = user.tenant_id === MASTER_TENANT_ID
                ? null
                : await tenantModel.getTenantById(user.tenant_id);
            tenantName = tenant && tenant.name ? tenant.name : null;
        }

        // Cache the session in Redis (fast path) and persist it durably in the
        // user_sessions table (fallback when Redis is flushed or restarted).
        await redisClient.setEx(`session:${refreshToken}`, REFRESH_TTL_SECONDS, user.id.toString());

        const expiresAt = toMySqlDatetime(new Date(Date.now() + REFRESH_TTL_SECONDS * 1000));
        try {
            await sessionModel.createSession({
                userId: user.id,
                tenantId: user.tenant_id,
                refreshTokenHash: hashRefreshToken(refreshToken),
                ipAddress: req.ip,
                userAgent: req.get('user-agent') || null,
                expiresAt
            });
        } catch (err) {
            // Keep Redis and the table consistent: if the durable row fails,
            // do not leave an orphaned session key behind.
            await redisClient.del(`session:${refreshToken}`);
            throw err;
        }

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: effectiveUserType,
                    tenantId: user.tenant_id,
                    isSaasAdmin,
                    tenantName,
                    mustChangePassword: Boolean(user.must_change_password)
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during login' });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Verify the refresh token mathematically
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
        }

        // Fast path: the session is alive in Redis (the cache is authoritative when hit).
        const cachedUserId = await redisClient.get(`session:${refreshToken}`);
        if (cachedUserId) {
            if (String(cachedUserId) !== String(decoded.userId)) {
                return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
            }
            const newAccessToken = generateToken({
                userId: decoded.userId,
                tenantId: decoded.tenantId,
                userType: decoded.userType,
                isSaasAdmin: decoded.isSaasAdmin
            });
            return res.status(200).json({
                status: 'success',
                data: { token: newAccessToken }
            });
        }

        // Fallback: Redis was cleared/restarted. Restore from the durable table.
        const row = await sessionModel.findByTokenHash(hashRefreshToken(refreshToken));
        if (!row
            || row.revoked_at
            || new Date(row.expires_at).getTime() <= Date.now()
            || String(row.user_id) !== String(decoded.userId)) {
            return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
        }

        // Refresh cache TTL so it matches the durable expiry
        const remainingSeconds = Math.max(1, Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000));
        await redisClient.setEx(`session:${refreshToken}`, remainingSeconds, row.user_id.toString());

        const newAccessToken = generateToken({
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            userType: decoded.userType,
            isSaasAdmin: decoded.isSaasAdmin
        });

        res.status(200).json({
            status: 'success',
            data: {
                token: newAccessToken
            }
        });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during refresh' });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Remove from Redis to invalidate the session instantly
        if (refreshToken) {
            await redisClient.del(`session:${refreshToken}`);
            // Keep the durable row for audit but mark it as ended
            await sessionModel.revokeByTokenHash(hashRefreshToken(refreshToken));
        }

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during logout' });
    }
};

module.exports = {
    login,
    changePassword,
    updateProfile,
    refresh,
    logout
};
