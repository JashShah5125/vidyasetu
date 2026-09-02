const express = require('express');
const router = express.Router();
const instituteController = require('../controllers/instituteController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/profile', instituteController.getProfile);
router.put('/profile', instituteController.updateProfile);

module.exports = router;