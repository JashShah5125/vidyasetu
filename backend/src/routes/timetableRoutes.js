const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { requireAuth } = require('../middleware/authMiddleware');

// All timetable scheduler routes require authentication
router.use(requireAuth);

// 1. Metadata / Filter dropdown options
router.get('/options', timetableController.getOptions);

// 2. Default Timetable (Template Management)
router.get('/default/:batchId', timetableController.getDefaultTimetable);
router.post('/default/:batchId', timetableController.saveDefaultTimetable);
router.post('/default/clone', timetableController.cloneDefaultTimetable);

// 3. Weekly Calendar Schedules & Operations
router.get('/weekly', timetableController.getWeeklyLectures);
router.post('/weekly/apply-default', timetableController.applyDefaultTimetable);
router.post('/weekly/replicate', timetableController.replicateWeek);
router.post('/validate-conflicts', timetableController.checkConflicts);

// 4. Individual Lecture CRUD & Actions
router.post('/lectures', timetableController.createLecture);
router.put('/lectures/:id', timetableController.updateLecture);
router.post('/lectures/:id/cancel', timetableController.cancelLecture);
router.delete('/lectures/:id', timetableController.deleteLecture);

module.exports = router;
