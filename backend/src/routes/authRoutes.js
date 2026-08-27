const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginSchema, refreshTokenSchema, updateProfileSchema, changePasswordSchema } = require('../validators/authValidator');

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// PUT /api/auth/profile
router.put('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);

// POST /api/auth/change-password
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// POST /api/auth/logout
router.post('/logout', validate(refreshTokenSchema), authController.logout);

module.exports = router;
