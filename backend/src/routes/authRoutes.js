const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');
const {
    loginSchema,
    refreshTokenSchema,
    updateProfileSchema,
    changePasswordSchema,
    forgotPasswordSendOtpSchema,
    forgotPasswordVerifyOtpSchema,
    forgotPasswordResetSchema
} = require('../validators/authValidator');

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// Forgot Password Flow
// 1. Send OTP to email
router.post('/forgot-password/send-otp', validate(forgotPasswordSendOtpSchema), authController.forgotPasswordSendOtp);
// 2. Verify OTP from email
router.post('/forgot-password/verify-otp', validate(forgotPasswordVerifyOtpSchema), authController.forgotPasswordVerifyOtp);
// 3. Reset password using verified token
router.post('/forgot-password/reset', validate(forgotPasswordResetSchema), authController.forgotPasswordReset);

// PUT /api/auth/profile
router.put('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);

// POST /api/auth/change-password
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// POST /api/auth/logout
router.post('/logout', validate(refreshTokenSchema), authController.logout);

module.exports = router;

