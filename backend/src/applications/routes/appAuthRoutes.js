const express = require('express');
const router = express.Router();
const appAuthController = require('../controllers/appAuthController');
const { requireAuth } = require('../../middleware/authMiddleware');

// Public Authentication Endpoints
router.post('/login', (req, res) => appAuthController.login(req, res));
router.post('/refresh-token', (req, res) => appAuthController.refreshToken(req, res));
router.post('/forgot-password', (req, res) => appAuthController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => appAuthController.resetPassword(req, res));

// Authenticated Student Endpoints
router.post('/change-password', requireAuth, (req, res) => appAuthController.changePassword(req, res));
router.post('/register-device', requireAuth, (req, res) => appAuthController.registerDevice(req, res));
router.post('/logout', requireAuth, (req, res) => appAuthController.logout(req, res));

module.exports = router;
