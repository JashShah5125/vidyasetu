const express = require('express');
const router = express.Router();
const appAcademicController = require('../controllers/appAcademicController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');

// All academic routes require Student Authentication
router.use(requireAuth);

// 1. Get Student Active Enrollment (Batch, Course, Program, Academic Year, Branch)
router.get('/enrollment', requirePermission('student.enrollment.view'), (req, res) => appAcademicController.getEnrollment(req, res));

// 2. Get Student Enrolled Subjects
router.get('/subjects', requirePermission('student.subject.view'), (req, res) => appAcademicController.getSubjects(req, res));

// 3. Get Assigned Faculty for Student's Batch
router.get('/faculty', requirePermission('student.faculty.view'), (req, res) => appAcademicController.getFaculty(req, res));

module.exports = router;
