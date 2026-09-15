const express = require('express');
const router = express.Router();
const branchAttendanceController = require('../controllers/branchAttendanceController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadAttendanceCsv } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

// Metadata & Academic Options (strictly scoped to branch)
router.get('/options', branchAttendanceController.getAttendanceOptions);

// Daily Lectures (branch-scoped)
router.get('/lectures/daily', branchAttendanceController.getDailyLectures);

// Student Roster & Marking
router.get('/roster/:lectureId', branchAttendanceController.getRoster);
router.post('/save/:lectureId', branchAttendanceController.saveAttendance);
router.post('/submit/:lectureId', branchAttendanceController.submitAttendance);
router.get('/template/:lectureId', branchAttendanceController.getTemplate);
router.post('/bulk-upload/:lectureId', uploadAttendanceCsv, branchAttendanceController.bulkUpload);

// Reports
router.get('/report/batch/:batchId', branchAttendanceController.getBatchReport);
router.get('/report/student/:studentId', branchAttendanceController.getStudentReport);

// Staff Attendance
router.get('/staff', branchAttendanceController.getStaffAttendance);
router.post('/staff/save', branchAttendanceController.saveStaffAttendance);
router.post('/staff/lecture/:lectureId', branchAttendanceController.saveStaffLectureAttendance);

module.exports = router;
