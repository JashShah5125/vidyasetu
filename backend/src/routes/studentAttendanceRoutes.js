const express = require('express');
const router = express.Router();
const studentAttendanceController = require('../controllers/studentAttendanceController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/lectures', studentAttendanceController.getLectures);
router.post('/check-in/:lectureId', studentAttendanceController.checkIn);

module.exports = router;

