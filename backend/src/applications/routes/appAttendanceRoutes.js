const express = require('express');
const router = express.Router();
const appAttendanceController = require('../controllers/appAttendanceController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');

// All attendance routes require Student Authentication
router.use(requireAuth);

// 1. Overall Attendance Summary Stats
router.get('/summary', requirePermission('student.attendance.view'), (req, res) => appAttendanceController.getSummary(req, res));

// 2. Date-wise Attendance History Log
router.get('/history', requirePermission('student.attendance.view'), (req, res) => appAttendanceController.getHistory(req, res));

// 3. Subject-wise Attendance Breakdown
router.get('/subject-wise', requirePermission('student.attendance.view'), (req, res) => appAttendanceController.getSubjectWise(req, res));

module.exports = router;
