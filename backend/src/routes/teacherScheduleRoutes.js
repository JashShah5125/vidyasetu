const express = require('express');
const router = express.Router();
const teacherScheduleController = require('../controllers/teacherScheduleController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All teacher schedule routes require authentication
router.use(requireAuth);

// 1. Scoped filter options for teacher
router.get('/options', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getOptions(req, res));

// 2. TODAY operational agenda
router.get('/today', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getToday(req, res));

// 3. WEEK detailed timetable
router.get('/week', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getWeek(req, res));

// 4. UPCOMING schedule
router.get('/upcoming', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getUpcoming(req, res));

// 5. Academic Events & Holidays
router.get('/academic-events', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getAcademicEvents(req, res));

// 6. Schedule changes & substitutions
router.get('/changes', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getChanges(req, res));

module.exports = router;
