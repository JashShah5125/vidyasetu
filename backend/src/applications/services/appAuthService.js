const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const appAuthModel = require('../models/appAuthModel');
const { generateToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken } = require('../../utils/jwt');

// Local datetime format helper for MySQL
const toMySqlDatetime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

class AppAuthService {
    /**
     * Mobile App Login (Student or Parent)
     */
    async login({ identifier, password, deviceMeta = {}, ipAddress = null, userAgent = null }) {
        const cleanIdentifier = identifier.trim();

        // 1. Try finding student user first, then parent user
        let user = await appAuthModel.findStudentUserByLoginIdentifier(cleanIdentifier);
        let userType = 'student';

        if (!user) {
            user = await appAuthModel.findParentUserByLoginIdentifier(cleanIdentifier);
            userType = 'parent';
        }

        if (!user) {
            const err = new Error('Invalid login credentials. Please check your Student Code, Email, Mobile, or Password.');
            err.statusCode = 401;
            throw err;
        }

        // Check account and app access status
        if (user.user_status !== 'active') {
            const err = new Error('Your account is currently inactive or suspended. Please contact your branch administrator.');
            err.statusCode = 403;
            throw err;
        }

        if (user.app_access_suspended) {
            const err = new Error('Mobile application access for this account has been temporarily disabled.');
            err.statusCode = 403;
            throw err;
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const err = new Error('Invalid login credentials. Please check your password.');
            err.statusCode = 401;
            throw err;
        }

        // Build JWT Payload
        let jwtPayload;
        if (userType === 'parent') {
            jwtPayload = {
                userId: user.user_id,
                tenantId: user.tenant_id,
                userType: 'parent',
                guardianId: user.guardian_id,
                guardianName: user.guardian_name
            };
        } else {
            jwtPayload = {
                userId: user.user_id,
                tenantId: user.tenant_id,
                userType: 'student',
                studentId: user.student_id,
                studentCode: user.student_code,
                primaryBranchId: user.primary_branch_id,
                enrollmentId: user.enrollment_id,
                batchId: user.batch_id
            };
        }

        const accessToken = generateToken(jwtPayload);
        const refreshToken = generateRefreshToken(jwtPayload);
        const refreshTokenHash = hashRefreshToken(refreshToken);

        // Optional device registration during login
        let deviceDbId = null;
        if (deviceMeta.deviceIdentifier) {
            deviceDbId = await appAuthModel.upsertAppDevice({
                tenantId: user.tenant_id,
                userId: user.user_id,
                deviceName: deviceMeta.deviceName || (userType === 'parent' ? 'Parent Mobile Device' : 'Student Mobile Device'),
                osType: deviceMeta.osType || 'Android',
                osVersion: deviceMeta.osVersion || null,
                appVersion: deviceMeta.appVersion || '1.0.0',
                deviceIdentifier: deviceMeta.deviceIdentifier
            });

            if (deviceMeta.fcmToken) {
                await appAuthModel.upsertPushToken({
                    tenantId: user.tenant_id,
                    userId: user.user_id,
                    deviceId: deviceDbId,
                    fcmToken: deviceMeta.fcmToken
                });
            }
        }

        // Store session (7-day validity)
        const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await appAuthModel.createSession({
            userId: user.user_id,
            tenantId: user.tenant_id,
            refreshTokenHash,
            deviceId: deviceDbId,
            ipAddress,
            userAgent,
            expiresAt: toMySqlDatetime(sessionExpiresAt)
        });

        // Update last login
        await appAuthModel.updateLastLogin(user.user_id);

        const tokenResponse = {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        };

        if (userType === 'parent') {
            const linkedChildren = await appAuthModel.getLinkedChildrenByGuardianId(user.tenant_id, user.guardian_id);
            return {
                tokens: tokenResponse,
                userType: 'parent',
                parent: {
                    guardianId: user.guardian_id,
                    fullName: user.guardian_name || user.name,
                    relation: user.relation,
                    email: user.email,
                    mobile: user.mobile,
                    occupation: user.occupation,
                    profilePhotoUrl: user.profile_photo_url,
                    address: user.address,
                    schoolName: user.school_name,
                    childrenCount: linkedChildren.length,
                    children: linkedChildren.map(c => ({
                        studentId: c.student_id,
                        studentCode: c.student_code,
                        fullName: c.full_name,
                        currentClass: c.current_class,
                        branchName: c.branch_name,
                        batchName: c.batch_name,
                        profilePhotoUrl: c.profile_photo_url,
                        isPrimary: Boolean(c.is_primary)
                    })),
                    mustChangePassword: Boolean(user.must_change_password)
                }
            };
        }

        return {
            tokens: tokenResponse,
            userType: 'student',
            student: {
                studentId: user.student_id,
                studentCode: user.student_code,
                fullName: user.full_name,
                email: user.email,
                mobile: user.mobile,
                primaryBranchId: user.primary_branch_id,
                branchName: user.branch_name,
                enrollmentId: user.enrollment_id,
                batchId: user.batch_id,
                batchName: user.batch_name,
                profilePhotoUrl: user.profile_photo_url,
                mustChangePassword: Boolean(user.must_change_password)
            }
        };
    }

    /**
     * Refresh Access Token
     */
    async refreshToken({ refreshToken, ipAddress = null, userAgent = null }) {
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            const error = new Error('Invalid or expired refresh token. Please sign in again.');
            error.statusCode = 401;
            throw error;
        }

        const tokenHash = hashRefreshToken(refreshToken);
        const session = await appAuthModel.findSessionByHash(tokenHash);
        if (!session) {
            const error = new Error('Session has been revoked or expired. Please sign in again.');
            error.statusCode = 401;
            throw error;
        }

        const user = await appAuthModel.findUserById(decoded.userId);
        if (!user || user.status !== 'active') {
            const error = new Error('User account is inactive or no longer exists.');
            error.statusCode = 403;
            throw error;
        }

        let newJwtPayload;
        if (decoded.userType === 'parent') {
            newJwtPayload = {
                userId: user.user_id,
                tenantId: user.tenant_id,
                userType: 'parent',
                guardianId: decoded.guardianId,
                guardianName: decoded.guardianName
            };
        } else {
            newJwtPayload = {
                userId: user.user_id,
                tenantId: user.tenant_id,
                userType: 'student',
                studentId: decoded.studentId,
                studentCode: decoded.studentCode,
                primaryBranchId: decoded.primaryBranchId,
                enrollmentId: decoded.enrollmentId,
                batchId: decoded.batchId
            };
        }

        const newAccessToken = generateToken(newJwtPayload);

        return {
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        };
    }

    /**
     * Change Password
     */
    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await appAuthModel.findUserById(userId);
        if (!user) {
            const err = new Error('User account not found.');
            err.statusCode = 404;
            throw err;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            const err = new Error('Current password does not match.');
            err.statusCode = 400;
            throw err;
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await appAuthModel.updatePassword(userId, newPasswordHash);

        return { success: true, message: 'Password updated successfully. Please use your new password next time you login.' };
    }

    /**
     * Forgot Password - Generate and Send OTP (Student or Parent)
     */
    async forgotPassword({ identifier }) {
        const cleanIdentifier = (identifier || '').trim();
        let user = await appAuthModel.findStudentUserByLoginIdentifier(cleanIdentifier);
        if (!user) {
            user = await appAuthModel.findParentUserByLoginIdentifier(cleanIdentifier);
        }

        if (!user) {
            // For security, do not disclose whether user exists, but return success
            return {
                message: 'If an active account matches the provided identifier, an OTP has been sent.'
            };
        }

        const mobile = user.mobile;
        if (!mobile) {
            const err = new Error('No registered mobile number associated with this account. Please contact branch administration.');
            err.statusCode = 400;
            throw err;
        }

        // Generate 6-digit OTP
        const plainOtp = String(Math.floor(100000 + Math.random() * 900000));
        const codeHash = crypto.createHash('sha256').update(plainOtp).digest('hex');

        // OTP expires in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await appAuthModel.createOtp({
            userId: user.user_id,
            mobile,
            codeHash,
            purpose: 'app_password_reset',
            expiresAt: toMySqlDatetime(expiresAt)
        });

        const maskedMobile = mobile.slice(0, 2) + '******' + mobile.slice(-2);

        return {
            message: `OTP sent successfully to registered mobile ending with ${maskedMobile}`,
            mobileMasked: maskedMobile,
            devOtp: process.env.NODE_ENV !== 'production' ? plainOtp : undefined
        };
    }

    /**
     * Reset Password using OTP
     */
    async resetPassword({ mobile, otp, newPassword }) {
        const cleanMobile = (mobile || '').trim();
        let activeOtp = await appAuthModel.findActiveOtp(cleanMobile, 'app_password_reset');
        if (!activeOtp) {
            activeOtp = await appAuthModel.findActiveOtp(cleanMobile, 'student_password_reset');
        }

        if (!activeOtp) {
            const err = new Error('Invalid or expired OTP. Please request a new one.');
            err.statusCode = 400;
            throw err;
        }

        if (activeOtp.attempt_count >= 5) {
            await appAuthModel.markOtpUsed(activeOtp.id);
            const err = new Error('Maximum OTP verification attempts exceeded. Please request a fresh OTP.');
            err.statusCode = 429;
            throw err;
        }

        const providedHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
        if (providedHash !== activeOtp.code_hash) {
            await appAuthModel.incrementOtpAttempt(activeOtp.id);
            const err = new Error('Incorrect OTP code entered.');
            err.statusCode = 400;
            throw err;
        }

        // Mark OTP as used
        await appAuthModel.markOtpUsed(activeOtp.id);

        // Update password for user
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await appAuthModel.updatePassword(activeOtp.user_id, newPasswordHash);

        // Invalidate all past sessions to force relogin
        await appAuthModel.revokeAllUserSessions(activeOtp.user_id);

        return {
            message: 'Password reset successfully. You can now login with your new password.'
        };
    }

    /**
     * Register Device & Push Token
     */
    async registerDevice(userId, tenantId, { deviceIdentifier, deviceName, osType, osVersion, appVersion, fcmToken }) {
        const deviceId = await appAuthModel.upsertAppDevice({
            tenantId,
            userId,
            deviceName: deviceName || 'Student Mobile Device',
            osType: osType || 'Android',
            osVersion: osVersion || null,
            appVersion: appVersion || '1.0.0',
            deviceIdentifier
        });

        if (fcmToken) {
            await appAuthModel.upsertPushToken({
                tenantId,
                userId,
                deviceId,
                fcmToken
            });
        }

        return {
            deviceId,
            registered: true,
            message: 'Device and push notification token registered successfully.'
        };
    }

    /**
     * Logout
     */
    async logout(userId, { refreshToken = null, fcmToken = null, deviceIdentifier = null }) {
        if (refreshToken) {
            const tokenHash = hashRefreshToken(refreshToken);
            await appAuthModel.revokeSession(tokenHash);
        }

        if (fcmToken || deviceIdentifier) {
            await appAuthModel.deactivatePushToken(userId, fcmToken, null);
        }

        return {
            message: 'Logged out successfully.'
        };
    }
}

module.exports = new AppAuthService();
