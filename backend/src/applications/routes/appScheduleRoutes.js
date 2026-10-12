const express = require('express');
const router = express.Router();
const appScheduleController = require('../controllers/appScheduleController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');

// All schedule routes require Student Authentication
router.use(requireAuth);

// 1. Get Today's Lecture Schedule
router.get('/today', requirePermission('student.schedule.view'), (req, res) => appScheduleController.getTodaySchedule(req, res));

// 2. Get Calendar / Weekly Schedule with date range filter
router.get('/calendar', requirePermission('student.schedule.view'), (req, res) => appScheduleController.getCalendarSchedule(req, res));

// 3. Get Details of a Specific Lecture Session
router.get('/lectures/:id', requirePermission('student.lecture.view'), (req, res) => appScheduleController.getLectureDetails(req, res));

module.exports = router;
