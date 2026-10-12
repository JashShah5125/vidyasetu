const express = require('express');
const router = express.Router();
const appParentProfileController = require('../controllers/appParentProfileController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/appUploadMiddleware');

// All profile routes require Parent Authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/parent/profile
 * @desc    Get logged-in parent profile with linked children
 * @access  Private (Parent)
 */
router.get('/', requirePermission('parent.profile.view'), (req, res) => appParentProfileController.getProfile(req, res));

/**
 * @route   PUT /api/app/parent/profile
 * @desc    Update parent contact and address info
 * @access  Private (Parent)
 */
router.put('/', requirePermission('parent.profile.update'), (req, res) => appParentProfileController.updateProfile(req, res));

/**
 * @route   POST /api/app/parent/profile/photo
 * @desc    Upload/Update parent profile photo avatar
 * @access  Private (Parent)
 */
router.post('/photo', requirePermission('parent.profile.photo'), uploadAvatar.single('photo'), (req, res) => appParentProfileController.updateProfilePhoto(req, res));

module.exports = router;
