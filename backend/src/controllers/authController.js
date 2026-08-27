const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashRefreshToken } = require('../utils/sessionHash');
const redisClient = require('../config/redis');

const MASTER_TENANT_ID = parseInt(process.env.MASTER_TENANT_ID) || 1;

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days, matches JWT_REFRESH_EXPIRES_IN

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

        let isSaasAdmin = false;
        
        if (user.tenant_id === MASTER_TENANT_ID) {
            isSaasAdmin = true;
        } 
        
        const permissions = await userModel.getUserPermissions(user.id, user.tenant_id);

        const sessionId = crypto.randomUUID();

        const tokenPayload = {
            userId: user.id,
            sessionId,
            tenantId: user.tenant_id,
            userType: user.user_type,
            isSaasAdmin,
            permissions
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

        await sessionModel.createSession({
            sessionId,
            userId: user.id,
            tenantId: user.tenant_id,
            refreshTokenHash: hashRefreshToken(refreshToken),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            expiresAt
        });

        // Store session in Redis with 7 days TTL; keyed by sessionId for fast refresh checks
        await redisClient.setEx(`session:${sessionId}`, SESSION_TTL_SECONDS, user.id.toString());

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                token,
                refreshToken,
                sessionId,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.user_type,
                    tenantId: user.tenant_id,
                    isSaasAdmin,
                    mustChangePassword: Boolean(user.must_change_password),
                    permissions
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

        // Check if the token exists in Redis
        const sessionId = decoded.sessionId;
        const redisUserId = await redisClient.get(`session:${sessionId}`);
        if (!redisUserId || String(redisUserId) !== String(decoded.userId)) {
            return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
        }

        // Authoritative check: the DB session row must still be active and unrevoked
        const activeSession = await sessionModel.findActiveBySessionId(sessionId, decoded.userId);
        if (!activeSession) {
            await redisClient.del(`session:${sessionId}`);
            return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
        }

        // Issue a new short-lived access token
        const newAccessToken = generateToken({
            userId: decoded.userId,
            sessionId,
            tenantId: decoded.tenantId,
            userType: decoded.userType,
            isSaasAdmin: decoded.isSaasAdmin,
            permissions: decoded.permissions
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

        if (refreshToken) {
            let sessionId = null;
            let userId = null;
            try {
                const decoded = verifyRefreshToken(refreshToken);
                sessionId = decoded.sessionId;
                userId = decoded.userId;
            } catch (err) {
                // Refresh token already invalid/expired; nothing more to revoke.
                return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
            }

            if (sessionId) {
                await sessionModel.revokeBySessionId(sessionId, userId);
                await redisClient.del(`session:${sessionId}`);
            } else {
                // Legacy token without sessionId: fall back to Redis-only invalidation.
                await redisClient.del(`session:${refreshToken}`);
            }
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
