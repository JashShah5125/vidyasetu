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

// 7. ATTENDANCE HISTORY
router.get('/history', requirePermission(['timetable.view', 'attendance.view']), (req, res) => teacherScheduleController.getHistory(req, res));

// 8. BATCH TURNOUT SUMMARY
router.get('/batch-summary', requirePermission(['timetable.view', 'attendance.view']), (req, res) => teacherScheduleController.getBatchSummary(req, res));

// 9. LOW ATTENDANCE ALERTS
router.get('/low-attendance', requirePermission(['timetable.view', 'attendance.view']), (req, res) => teacherScheduleController.getLowAttendance(req, res));

// 10. AVAILABILITY: Get teacher's weekly schedule & exceptions
router.get('/availability', requirePermission('timetable.view'), (req, res) => teacherScheduleController.getAvailability(req, res));

// 11. AVAILABILITY: Save recurring weekly availability
router.post('/availability/weekly', requirePermission('timetable.view'), (req, res) => teacherScheduleController.saveWeeklyAvailability(req, res));

// 12. AVAILABILITY: Add unavailable date block / leave exception
router.post('/availability/exception', requirePermission('timetable.view'), (req, res) => teacherScheduleController.addUnavailableException(req, res));

// 13. AVAILABILITY: Delete availability slot / exception
router.delete('/availability/:id', requirePermission('timetable.view'), (req, res) => teacherScheduleController.deleteAvailabilitySlot(req, res));

module.exports = router;
