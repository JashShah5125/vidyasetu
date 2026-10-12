const express = require('express');
const router = express.Router({ mergeParams: true });
const appParentAcademicController = require('../controllers/appParentAcademicController');
const { requirePermission } = require('../../middleware/authMiddleware');

// ==========================================
// 1. TIMETABLE & SCHEDULE
// ==========================================

/**
 * @route   GET /api/app/parent/children/:studentId/timetable/today
 * @desc    Get child's timetable for today
 * @access  Private (Parent)
 */
router.get('/timetable/today', requirePermission('parent.academic.view'), (req, res) => appParentAcademicController.getTodaySchedule(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/timetable/calendar
 * @desc    Get child's calendar/weekly schedule (?from=...&to=...)
 * @access  Private (Parent)
 */
router.get('/timetable/calendar', requirePermission('parent.academic.view'), (req, res) => appParentAcademicController.getCalendarSchedule(req, res));

// ==========================================
// 2. ATTENDANCE TRACKER
// ==========================================

/**
 * @route   GET /api/app/parent/children/:studentId/attendance/summary
 * @desc    Overall attendance stats & standing percentage for child
 * @access  Private (Parent)
 */
router.get('/attendance/summary', requirePermission('parent.attendance.view'), (req, res) => appParentAcademicController.getAttendanceSummary(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/attendance/history
 * @desc    Child's date-wise / month-wise attendance calendar log (?month=...&year=... or ?date=YYYY-MM-DD)
 * @access  Private (Parent)
 */
router.get('/attendance/history', requirePermission('parent.attendance.view'), (req, res) => appParentAcademicController.getAttendanceHistory(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/attendance/subject-wise
 * @desc    Subject-wise attendance breakdown for child
 * @access  Private (Parent)
 */
router.get('/attendance/subject-wise', requirePermission('parent.attendance.view'), (req, res) => appParentAcademicController.getSubjectWiseAttendance(req, res));

// ==========================================
// 3. EXAMS & ASSESSMENTS
// ==========================================

/**
 * @route   GET /api/app/parent/children/:studentId/exams/upcoming
 * @desc    List upcoming scheduled exams with dates, timings, and syllabus topics
 * @access  Private (Parent)
 */
router.get('/exams/upcoming', requirePermission('parent.exam.view'), (req, res) => appParentAcademicController.getUpcomingExams(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/exams/results
 * @route   GET /api/app/parent/children/:studentId/exams/completed
 * @desc    List completed exam results for child [Paginated]
 * @access  Private (Parent)
 */
router.get('/exams/results', requirePermission('parent.exam.view'), (req, res) => appParentAcademicController.getExamResults(req, res));
router.get('/exams/completed', requirePermission('parent.exam.view'), (req, res) => appParentAcademicController.getExamResults(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/exams/results/:examId
 * @desc    Detailed exam scorecard breakdown with subject marks, class average, and teacher remarks
 * @access  Private (Parent)
 */
router.get('/exams/results/:examId', requirePermission('parent.exam.view'), (req, res) => appParentAcademicController.getExamResultDetails(req, res));

// ==========================================
// 4. HOMEWORK & ASSIGNMENTS
// ==========================================

/**
 * @route   GET /api/app/parent/children/:studentId/homeworks
 * @desc    List child's assigned homeworks & submission status (?status=pending|submitted|graded|overdue) [Paginated]
 * @access  Private (Parent)
 */
router.get('/homeworks', requirePermission('parent.homework.view'), (req, res) => appParentAcademicController.getHomeworks(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/homeworks/:id
 * @desc    View homework details, instructions, teacher attachments, and child's submission
 * @access  Private (Parent)
 */
router.get('/homeworks/:id', requirePermission('parent.homework.view'), (req, res) => appParentAcademicController.getHomeworkDetails(req, res));

module.exports = router;
