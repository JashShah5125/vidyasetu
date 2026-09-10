const express = require('express');
const router = express.Router();
const teacherScheduleController = require('../controllers/teacherScheduleController');
const { requireAuth } = require('../middleware/authMiddleware');

// All teacher schedule routes require authentication
router.use(requireAuth);

// 1. Scoped filter options for teacher
router.get('/options', (req, res) => teacherScheduleController.getOptions(req, res));

// 2. TODAY operational agenda
router.get('/today', (req, res) => teacherScheduleController.getToday(req, res));

// 3. WEEK detailed timetable
router.get('/week', (req, res) => teacherScheduleController.getWeek(req, res));

// 4. UPCOMING schedule
router.get('/upcoming', (req, res) => teacherScheduleController.getUpcoming(req, res));

// 5. Academic Events & Holidays
router.get('/academic-events', (req, res) => teacherScheduleController.getAcademicEvents(req, res));

// 6. Schedule changes & substitutions
router.get('/changes', (req, res) => teacherScheduleController.getChanges(req, res));

module.exports = router;
