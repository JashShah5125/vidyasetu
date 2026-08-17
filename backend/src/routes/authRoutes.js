const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { loginSchema, refreshTokenSchema } = require('../validators/authValidator');

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// POST /api/auth/logout
router.post('/logout', validate(refreshTokenSchema), authController.logout);

module.exports = router;
