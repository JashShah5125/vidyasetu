const express = require('express');
const router = express.Router();
const appProfileController = require('../controllers/appProfileController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/appUploadMiddleware');

// All profile routes require Student Authentication
router.use(requireAuth);

// 1. Get Student Profile
router.get('/', requirePermission('student.profile.view'), (req, res) => appProfileController.getProfile(req, res));

// 2. Update Student Allowed Contact Info
router.put('/', requirePermission('student.profile.update'), (req, res) => appProfileController.updateProfile(req, res));

// 3. Upload Profile Photo Avatar
router.post('/photo', requirePermission('student.profile.photo'), uploadAvatar.single('photo'), (req, res) => appProfileController.updateProfilePhoto(req, res));

// 4. Get Student Guardians
router.get('/guardians', requirePermission('student.guardian.view'), (req, res) => appProfileController.getGuardians(req, res));

// 5. Get Student Uploaded Documents
router.get('/documents', requirePermission('student.document.view'), (req, res) => appProfileController.getDocuments(req, res));

module.exports = router;
