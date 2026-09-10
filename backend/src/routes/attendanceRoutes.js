const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Metadata / filter dropdowns
router.get('/options', attendanceController.getAttendanceOptions);

// Daily / teacher lectures
router.get('/lectures/today', attendanceController.getTodayLectures);
router.get('/lectures/daily', attendanceController.getDailyLectures);

// Roster & marking
router.get('/roster/:lectureId', attendanceController.getRoster);
router.post('/save/:lectureId', attendanceController.saveAttendance);
router.post('/submit/:lectureId', attendanceController.submitAttendance);

// Reports
router.get('/report/batch/:batchId', attendanceController.getBatchReport);
router.get('/report/student/:studentId', attendanceController.getStudentReport);

// Staff attendance (day sheet + teacher lecture-wise)
router.get('/staff', attendanceController.getStaffAttendance);
router.post('/staff/save', attendanceController.saveStaffAttendance);
router.post('/staff/lecture/:lectureId', attendanceController.saveStaffLectureAttendance);

module.exports = router;
