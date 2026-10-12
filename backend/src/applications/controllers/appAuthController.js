const appAuthService = require('../services/appAuthService');
const {
    validateLoginPayload,
    validateRefreshTokenPayload,
    validateChangePasswordPayload,
    validateForgotPasswordPayload,
    validateResetPasswordPayload,
    validateRegisterDevicePayload
} = require('../validators/appAuthValidator');

class AppAuthController {
    /**
     * POST /api/app/auth/login
     */
    async login(req, res) {
        try {
            const validationError = validateLoginPayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const { identifier, password, deviceMeta } = req.body;
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
            const userAgent = req.headers['user-agent'] || null;

            const result = await appAuthService.login({
                identifier,
                password,
                deviceMeta,
                ipAddress,
                userAgent
            });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            console.error('[AppAuthController.login]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error during login'
            });
        }
    }

    /**
     * POST /api/app/auth/refresh-token
     */
    async refreshToken(req, res) {
        try {
            const validationError = validateRefreshTokenPayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const { refreshToken } = req.body;
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
            const userAgent = req.headers['user-agent'] || null;

            const result = await appAuthService.refreshToken({ refreshToken, ipAddress, userAgent });

            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: result
            });
        } catch (error) {
            console.error('[AppAuthController.refreshToken]', error.message);
            return res.status(error.statusCode || 401).json({
                success: false,
                message: error.message || 'Failed to refresh token'
            });
        }
    }

    /**
     * POST /api/app/auth/change-password
     */
    async changePassword(req, res) {
        try {
            const validationError = validateChangePasswordPayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const userId = req.user.userId || req.user.id;
            const result = await appAuthService.changePassword(userId, req.body);

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('[AppAuthController.changePassword]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to change password'
            });
        }
    }

    /**
     * POST /api/app/auth/forgot-password
     */
    async forgotPassword(req, res) {
        try {
            const validationError = validateForgotPasswordPayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const result = await appAuthService.forgotPassword(req.body);

            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('[AppAuthController.forgotPassword]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to process forgot password request'
            });
        }
    }

    /**
     * POST /api/app/auth/reset-password
     */
    async resetPassword(req, res) {
        try {
            const validationError = validateResetPasswordPayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const result = await appAuthService.resetPassword(req.body);

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('[AppAuthController.resetPassword]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to reset password'
            });
        }
    }

    /**
     * POST /api/app/auth/register-device
     */
    async registerDevice(req, res) {
        try {
            const validationError = validateRegisterDevicePayload(req.body);
            if (validationError) {
                return res.status(400).json({ success: false, message: validationError });
            }

            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const result = await appAuthService.registerDevice(userId, tenantId, req.body);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            console.error('[AppAuthController.registerDevice]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to register device'
            });
        }
    }

    /**
     * POST /api/app/auth/logout
     */
    async logout(req, res) {
        try {
            const userId = req.user?.userId || req.user?.id;
            const result = await appAuthService.logout(userId, req.body || {});

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('[AppAuthController.logout]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to logout'
            });
        }
    }
}

module.exports = new AppAuthController();
