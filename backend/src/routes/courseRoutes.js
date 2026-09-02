const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All course routes require authentication.
router.use(requireAuth);

router.get('/', requirePermission('course.view'), courseController.getCourses);
router.post('/', requirePermission('course.create'), courseController.createCourse);
router.get('/:code', requirePermission('course.view'), courseController.getCourseByCode);
router.put('/:code', requirePermission('course.update'), courseController.updateCourse);
router.delete('/:code', requirePermission('course.delete'), courseController.deleteCourse);

module.exports = router;
