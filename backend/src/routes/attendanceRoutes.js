const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { uploadAttendanceCsv } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

// Metadata / filter dropdowns
router.get('/options', requirePermission('attendance.view'), attendanceController.getAttendanceOptions);

// Daily / teacher lectures
router.get('/lectures/today', requirePermission('attendance.view'), attendanceController.getTodayLectures);
router.get('/lectures/daily', requirePermission('attendance.view'), attendanceController.getDailyLectures);

// Roster & marking
router.get('/roster/:lectureId', requirePermission('attendance.view'), attendanceController.getRoster);
router.post('/save/:lectureId', requirePermission('attendance.mark'), attendanceController.saveAttendance);
router.post('/submit/:lectureId', requirePermission('attendance.mark'), attendanceController.submitAttendance);
router.get('/template/:lectureId', requirePermission('attendance.mark'), attendanceController.getTemplate);
router.post('/bulk-upload/:lectureId', requirePermission('attendance.mark'), uploadAttendanceCsv, attendanceController.bulkUpload);

// Reports
router.get('/report/batch/:batchId', requirePermission('attendance.view'), attendanceController.getBatchReport);
router.get('/report/student/:studentId', requirePermission('attendance.view'), attendanceController.getStudentReport);

// Staff attendance (day sheet + teacher lecture-wise)
router.get('/staff', requirePermission('attendance.view'), attendanceController.getStaffAttendance);
router.post('/staff/save', requirePermission('attendance.mark'), attendanceController.saveStaffAttendance);
router.post('/staff/lecture/:lectureId', requirePermission('attendance.mark'), attendanceController.saveStaffLectureAttendance);

module.exports = router;
