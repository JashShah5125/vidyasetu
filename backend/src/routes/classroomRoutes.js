const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All classroom routes require authentication.
router.use(requireAuth);

router.get('/', requirePermission('classroom.view'), classroomController.getClassrooms);
router.post('/', requirePermission('classroom.create'), classroomController.createClassroom);
router.get('/:id', requirePermission('classroom.view'), classroomController.getClassroom);
router.put('/:id', requirePermission('classroom.update'), classroomController.updateClassroom);
router.delete('/:id', requirePermission('classroom.delete'), classroomController.deleteClassroom);

module.exports = router;