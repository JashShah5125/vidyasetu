const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const classroomController = require('../controllers/classroomController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All branch routes require authentication.
router.use(requireAuth);

router.get('/', requirePermission('branch.view'), branchController.getBranches);
router.post('/', requirePermission('branch.create'), branchController.createBranch);

// Branch classroom CRUD
router.get('/:branchId/classrooms', requirePermission('classroom.view'), classroomController.getClassrooms);
router.post('/:branchId/classrooms', requirePermission('classroom.create'), classroomController.createClassroom);
router.get('/:branchId/classrooms/:classroomId', requirePermission('classroom.view'), classroomController.getClassroom);
router.patch('/:branchId/classrooms/:classroomId', requirePermission('classroom.update'), classroomController.updateClassroom);
router.put('/:branchId/classrooms/:classroomId', requirePermission('classroom.update'), classroomController.updateClassroom);
router.patch('/:branchId/classrooms/:classroomId/status', requirePermission('classroom.update'), classroomController.changeClassroomStatus);
router.delete('/:branchId/classrooms/:classroomId', requirePermission('classroom.delete'), classroomController.deleteClassroom);

// Branch course & program configuration
router.get('/:branchId/courses', requirePermission('branch.view'), branchController.getBranchCourses);
router.post('/:branchId/courses/batch-assign', requirePermission('branch.update'), branchController.batchAssignBranchCourses);
router.post('/:branchId/courses/:courseId/assign', requirePermission('branch.update'), branchController.assignBranchCourse);
router.post('/:branchId/courses/:courseId/unassign', requirePermission('branch.update'), branchController.unassignBranchCourse);
router.delete('/:branchId/courses/:courseId', requirePermission('branch.update'), branchController.unassignBranchCourse);
router.post('/:branchId/programs/:programId/toggle', requirePermission('branch.update'), branchController.toggleBranchProgram);

router.get('/:code', requirePermission('branch.view'), branchController.getBranch);
router.put('/:code', requirePermission('branch.update'), branchController.updateBranch);
router.delete('/:code', requirePermission('branch.delete'), branchController.deleteBranch);

module.exports = router;