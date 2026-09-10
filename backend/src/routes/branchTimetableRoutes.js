const express = require('express');
const router = express.Router();
const branchTimetableController = require('../controllers/branchTimetableController');
const { requireAuth } = require('../middleware/authMiddleware');

// All branch timetable scheduler routes require authentication
router.use(requireAuth);

// 1. Metadata / Filter dropdown options for authenticated branch
router.get('/options', branchTimetableController.getOptions);

// 2. Default Timetable (Template Management)
router.post('/default/clone', branchTimetableController.cloneDefaultTimetable);
router.get('/default/:batchId', branchTimetableController.getDefaultTimetable);
router.post('/default/:batchId', branchTimetableController.saveDefaultTimetable);

// 3. Weekly Calendar Schedules & Operations
router.get('/weekly', branchTimetableController.getWeeklyLectures);
router.post('/weekly/apply-default', branchTimetableController.applyDefaultTimetable);
router.post('/weekly/replicate', branchTimetableController.replicateWeek);
router.post('/validate-conflicts', branchTimetableController.checkConflicts);

// 4. Individual Lecture CRUD & Actions
router.post('/lectures', branchTimetableController.createLecture);
router.put('/lectures/:id', branchTimetableController.updateLecture);
router.post('/lectures/:id/cancel', branchTimetableController.cancelLecture);
router.delete('/lectures/:id', branchTimetableController.deleteLecture);

module.exports = router;
