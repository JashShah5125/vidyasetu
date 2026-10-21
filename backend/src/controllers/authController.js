const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const tenantModel = require('../models/tenantModel');
const { generateToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken, REFRESH_TTL_SECONDS } = require('../utils/jwt');
const redisClient = require('../config/redis');
const AuditService = require('../services/auditService');
const { sendPasswordResetOtpEmail } = require('../services/mailService');

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
        const userId = req.user?.userId || req.user?.id;

        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User account not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ status: 'error', message: 'New password cannot be the same as the current password' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword(userId, passwordHash);

        AuditService.logFromRequest(req, {
            action: 'PASSWORD_CHANGE',
            entityType: 'user',
            entityId: userId,
            userId,
            severity: 'info'
        });

        res.status(200).json({ status: 'success', message: 'Password changed successfully. Please use your new password next time you sign in.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to change password' });
    }
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.userId;

        let normalizedEmail = email;
        if (email) {
            normalizedEmail = email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(normalizedEmail)) {
                return res.status(400).json({ status: 'error', message: 'Invalid email format: Email ID contains invalid characters' });
            }
            const existing = await userModel.findUserByEmail(normalizedEmail);
            if (existing && existing.length > 0 && existing.some(u => u.id !== userId)) {
                return res.status(409).json({ status: 'error', message: 'An account with this email address already exists.' });
            }
        }

        await userModel.updateUserProfile(userId, { name: name ? name.trim() : name, email: normalizedEmail });
        res.status(200).json({ status: 'success', message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        if (error.statusCode === 409 || (error.message && error.message.includes('already in use'))) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Unable to update profile' });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        const users = await userModel.findUserByEmail(normalizedEmail);
        
        if (!users || users.length === 0) {
            // Check if this email belongs to a lead in saas_leads
            const [leads] = await pool.query(
                `SELECT institute_name, status FROM saas_leads WHERE email = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
                [normalizedEmail]
            );

            if (leads && leads.length > 0) {
                const lead = leads[0];
                const instName = lead.institute_name || 'your institution';

                if (lead.status === 7) {
                    // Lost / Cold / Rejected
                    return res.status(403).json({
                        status: 'error',
                        code: 'LEAD_REJECTED',
                        message: `Your registration request for ${instName} was not approved. Please contact support for more details.`
                    });
                } else if (lead.status === 6) {
                    // Converted, but credentials might need password setup or invite link
                    return res.status(403).json({
                        status: 'error',
                        code: 'LEAD_CONVERTED',
                        message: `Your account for ${instName} has been approved. Please check your registered email for login setup instructions.`
                    });
                } else {
                    // 1: New Lead, 2: Contacted, 3: Follow-up, 4: Plan Assigned, 5: Hot Lead (all in progress)
                    return res.status(403).json({
                        status: 'error',
                        code: 'LEAD_PENDING',
                        message: `Your institute registration for ${instName} is currently under review. You will receive your login credentials via email once approved.`
                    });
                }
            }

            AuditService.logFromRequest(req, {
                action: 'LOGIN_FAILED',
                entityType: 'auth',
                severity: 'warning',
                newValues: { email: normalizedEmail, reason: 'user_not_found' }
            });
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        let user = null;
        if (users.length === 1) {
            user = users[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                AuditService.logFromRequest(req, {
                    action: 'LOGIN_FAILED',
                    entityType: 'auth',
                    entityId: user.id,
                    userId: user.id,
                    tenantId: user.tenant_id,
                    severity: 'warning',
                    newValues: { email: normalizedEmail, reason: 'invalid_password' }
                });
                return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
            }
        } else {
            // When multiple tenant accounts share the same email, resolve by checking matching password hash
            const matchingUsers = [];
            for (const candidate of users) {
                if (candidate.status === 'active') {
                    const matches = await bcrypt.compare(password, candidate.password_hash);
                    if (matches) {
                        matchingUsers.push(candidate);
                    }
                }
            }

            if (matchingUsers.length === 1) {
                user = matchingUsers[0];
            } else if (matchingUsers.length > 1) {
                // If multiple accounts share both email and password, prioritize SaaS Admin (tenant_id = 1) or first active account
                user = matchingUsers.find(u => u.tenant_id === MASTER_TENANT_ID || u.tenant_id === 1 || u.user_type === 'saas_admin') || matchingUsers[0];
            } else {
                AuditService.logFromRequest(req, {
                    action: 'LOGIN_FAILED',
                    entityType: 'auth',
                    severity: 'warning',
                    newValues: { email: normalizedEmail, reason: 'invalid_credentials_multi_user' }
                });
                return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
            }
        }

        if (user.status !== 'active') {
            AuditService.logFromRequest(req, {
                action: 'LOGIN_FAILED',
                entityType: 'auth',
                entityId: user.id,
                userId: user.id,
                tenantId: user.tenant_id,
                severity: 'warning',
                newValues: { email: normalizedEmail, reason: 'inactive_account' }
            });
            return res.status(403).json({ status: 'error', message: 'Account is not active' });
        }

        // Login resolves identity (users) + role (user_roles) only.
        // Check whether user has at least one active assigned role in user_roles table.
        const roleCodes = await userModel.getUserRoleCodes(user.id);
        let isSaasAdmin = user.tenant_id === MASTER_TENANT_ID || user.tenant_id === 1 || roleCodes.includes('saas_admin') || roleCodes.includes('saas-admin') || user.user_type === 'saas_admin' || user.user_type === 'saas-admin';

        if (!isSaasAdmin && (!roleCodes || roleCodes.length === 0)) {
            return res.status(403).json({
                status: 'error',
                message: 'Login failed. No security role assigned to your account. Please contact system administrator.'
            });
        }

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
            isSaasAdmin: Boolean(isSaasAdmin)
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Resolve the requester's organization/tenant name for display (used by
        // the support ticket "Requester Organization" field and general UI).
        let tenantName = null;
        let branchInfo = null;
        if (!isSaasAdmin && user.tenant_id) {
            const tenant = user.tenant_id === MASTER_TENANT_ID
                ? null
                : await tenantModel.getTenantById(user.tenant_id);
            if (tenant) {
                if (tenant.status !== 1) {
                    const statusMsg = tenant.status === 2
                        ? 'Institute account is pending setup or approval.'
                        : tenant.status === 3
                        ? 'Institute account has been deleted.'
                        : 'Institute account is inactive or suspended. Please contact administrator.';
                    return res.status(403).json({
                        status: 'error',
                        message: statusMsg
                    });
                }
                tenantName = tenant.name || null;
            }

            if (user.id) {
                const [branchRows] = await pool.query(`
                    SELECT b.id, b.name, b.code
                    FROM user_branch_access uba
                    JOIN branches b ON uba.branch_id = b.id
                    WHERE uba.user_id = ? AND uba.revoked_at IS NULL AND b.deleted_at IS NULL
                    ORDER BY uba.is_primary DESC, uba.id DESC
                    LIMIT 1
                `, [user.id]);
                if (branchRows[0]) {
                    branchInfo = branchRows[0];
                }
            }
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

        AuditService.logFromRequest(req, {
            action: 'LOGIN_SUCCESS',
            entityType: 'auth',
            entityId: user.id,
            userId: user.id,
            tenantId: user.tenant_id,
            branchId: branchInfo ? branchInfo.id : null,
            severity: 'info',
            newValues: { email: user.email, role: effectiveUserType }
        });

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
                    branch: branchInfo ? branchInfo.name : null,
                    branchId: branchInfo ? String(branchInfo.id) : null,
                    branchCode: branchInfo ? branchInfo.code : null,
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

            try {
                const decoded = verifyRefreshToken(refreshToken);
                AuditService.logFromRequest(req, {
                    action: 'LOGOUT',
                    entityType: 'auth',
                    entityId: decoded.userId,
                    userId: decoded.userId,
                    tenantId: decoded.tenantId,
                    severity: 'info'
                });
            } catch (_) {}
        } else if (req.user) {
            AuditService.logFromRequest(req, {
                action: 'LOGOUT',
                entityType: 'auth',
                entityId: req.user.userId || req.user.id,
                severity: 'info'
            });
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

const forgotPasswordSendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        // 1. Look up active user in users table
        const [users] = await pool.query(
            `SELECT id, name, email, status, tenant_id FROM users WHERE email = ? AND deleted_at IS NULL`,
            [normalizedEmail]
        );

        if (!users || users.length === 0) {
            // Check if they are a lead
            const [leads] = await pool.query(
                `SELECT institute_name, status FROM saas_leads WHERE email = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
                [normalizedEmail]
            );
            if (leads && leads.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: `This email is associated with a pending registration for ${leads[0].institute_name}. Once approved, your temporary password will be emailed.`
                });
            }
            return res.status(404).json({
                status: 'error',
                message: 'No registered user account found with this email address.'
            });
        }

        const activeUsers = users.filter(u => u.status === 'active');
        if (activeUsers.length === 0) {
            return res.status(403).json({
                status: 'error',
                message: 'Your account is currently inactive or suspended. Please contact your administrator.'
            });
        }

        const targetUser = activeUsers[0];

        // 2. Generate 6-digit OTP
        const otpCode = String(crypto.randomInt(100000, 999999));
        const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 3. Invalidate previous unused password_reset OTPs for this user
        await pool.query(
            `UPDATE otp_codes SET used_at = NOW() WHERE user_id = ? AND purpose = 'password_reset' AND used_at IS NULL`,
            [targetUser.id]
        );

        // 4. Save new OTP in otp_codes table
        await pool.query(
            `INSERT INTO otp_codes (user_id, mobile, code_hash, purpose, expires_at, created_at)
             VALUES (?, ?, ?, 'password_reset', ?, NOW())`,
            [targetUser.id, targetUser.mobile || null, codeHash, toMySqlDatetime(expiresAt)]
        );

        // 5. Send email via mailService
        try {
            await sendPasswordResetOtpEmail({
                recipientEmail: targetUser.email,
                userName: targetUser.name,
                otpCode,
                expiresInMinutes: 5
            });
        } catch (mailErr) {
            console.error('[forgotPasswordSendOtp] Failed to send email via SMTP:', mailErr.message);
            // In dev/test if SMTP is not fully configured, log the OTP for debugging
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[DEV NOTE] Password reset OTP for ${targetUser.email} is: ${otpCode}`);
            }
        }

        AuditService.logFromRequest(req, {
            action: 'PASSWORD_RESET_REQUESTED',
            entityType: 'auth',
            entityId: targetUser.id,
            userId: targetUser.id,
            tenantId: targetUser.tenant_id,
            severity: 'info',
            newValues: { email: normalizedEmail }
        });

        res.status(200).json({
            status: 'success',
            message: `A 6-digit verification code has been sent to ${normalizedEmail}. It will expire in 5 minutes.`
        });
    } catch (error) {
        console.error('forgotPasswordSendOtp error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to send verification code. Please try again later.' });
    }
};

const forgotPasswordVerifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();
        const cleanOtp = String(otp || '').trim();

        const [users] = await pool.query(
            `SELECT id, name, email, status FROM users WHERE email = ? AND deleted_at IS NULL`,
            [normalizedEmail]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const user = users[0];
        const codeHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

        // Check latest unexpired OTP for this user
        const [rows] = await pool.query(
            `SELECT * FROM otp_codes 
             WHERE user_id = ? AND purpose = 'password_reset' AND used_at IS NULL
             ORDER BY id DESC LIMIT 1`,
            [user.id]
        );

        if (!rows || rows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No active verification code found. Please request a new one.' });
        }

        const record = rows[0];

        // Check expiration
        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ status: 'error', message: 'Verification code has expired. Please request a new code.' });
        }

        // Check maximum attempts (limit 5 attempts)
        if (record.attempt_count >= 5) {
            await pool.query(`UPDATE otp_codes SET used_at = NOW() WHERE id = ?`, [record.id]);
            return res.status(400).json({ status: 'error', message: 'Too many incorrect attempts. Please request a new code.' });
        }

        // Validate hash
        if (record.code_hash !== codeHash) {
            await pool.query(`UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = ?`, [record.id]);
            return res.status(400).json({ status: 'error', message: 'Invalid verification code. Please check your email and try again.' });
        }

        // 1. Mark OTP as used
        await pool.query(`UPDATE otp_codes SET used_at = NOW() WHERE id = ?`, [record.id]);

        // 2. Mark email as verified on user record!
        await pool.query(
            `UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?`,
            [user.id]
        );

        // 3. Generate a secure, single-use reset token valid for 15 minutes
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

        // Invalidate previous password_resets for this user
        await pool.query(
            `UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
            [user.id]
        );

        await pool.query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, NOW())`,
            [user.id, tokenHash, toMySqlDatetime(tokenExpires)]
        );

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully. You may now reset your password.',
            data: {
                resetToken: rawToken
            }
        });
    } catch (error) {
        console.error('forgotPasswordVerifyOtp error:', error);
        res.status(500).json({ status: 'error', message: 'Verification failed. Please try again.' });
    }
};

const forgotPasswordReset = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        const [users] = await pool.query(
            `SELECT id, name, email, tenant_id FROM users WHERE email = ? AND deleted_at IS NULL`,
            [normalizedEmail]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const user = users[0];
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Check password_resets record
        const [records] = await pool.query(
            `SELECT * FROM password_resets 
             WHERE user_id = ? AND token_hash = ? AND used_at IS NULL 
             ORDER BY id DESC LIMIT 1`,
            [user.id, tokenHash]
        );

        if (!records || records.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid or already used reset session. Please restart the process.' });
        }

        const resetRecord = records[0];
        if (new Date(resetRecord.expires_at) < new Date()) {
            return res.status(400).json({ status: 'error', message: 'Reset session has expired. Please restart the process.' });
        }

        // Hash new password and update user
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            `UPDATE users 
             SET password_hash = ?, must_change_password = 0, password_generated_at = NOW(), updated_at = NOW() 
             WHERE id = ?`,
            [passwordHash, user.id]
        );

        // Mark reset token used
        await pool.query(`UPDATE password_resets SET used_at = NOW() WHERE id = ?`, [resetRecord.id]);

        // Revoke all existing sessions so user logs in afresh with new password
        await sessionModel.revokeAllByUserId(user.id);

        AuditService.logFromRequest(req, {
            action: 'PASSWORD_RESET_COMPLETED',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            tenantId: user.tenant_id,
            severity: 'info'
        });

        res.status(200).json({
            status: 'success',
            message: 'Password has been reset successfully. Please sign in with your new password.'
        });
    } catch (error) {
        console.error('forgotPasswordReset error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reset password. Please try again.' });
    }
};

module.exports = {
    login,
    changePassword,
    updateProfile,
    refresh,
    logout,
    forgotPasswordSendOtp,
    forgotPasswordVerifyOtp,
    forgotPasswordReset
};

