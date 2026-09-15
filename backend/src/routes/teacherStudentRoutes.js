const express = require('express');
const router = express.Router();
const teacherStudentController = require('../controllers/teacherStudentController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All teacher student routes require authentication
router.use(requireAuth);

// 1. Scoped filter options for teacher
router.get('/options', requirePermission('student.view'), (req, res) => teacherStudentController.getOptions(req, res));

// 2. Teacher-scoped student roster
router.get('/', requirePermission('student.view'), (req, res) => teacherStudentController.getStudents(req, res));

// 3. Teacher-scoped student profile
router.get('/:id', requirePermission('student.view'), (req, res) => teacherStudentController.getStudentById(req, res));

// 4. Teacher-scoped student assignments, homeworks, and exam submissions
router.get('/:id/assignments', requirePermission('assignment.view'), (req, res) => teacherStudentController.getStudentAssignments(req, res));

module.exports = router;