const express = require('express');
const router = express.Router();

const appAuthRoutes = require('./routes/appAuthRoutes');
const appProfileRoutes = require('./routes/appProfileRoutes');
const appAcademicRoutes = require('./routes/appAcademicRoutes');
const appScheduleRoutes = require('./routes/appScheduleRoutes');
const appAttendanceRoutes = require('./routes/appAttendanceRoutes');
const appHomeworkRoutes = require('./routes/appHomeworkRoutes');
const appExamRoutes = require('./routes/appExamRoutes');
const appDoubtRoutes = require('./routes/appDoubtRoutes');
const appFeeRoutes = require('./routes/appFeeRoutes');
const appParentRoutes = require('./routes/appParentRoutes');

// Mount Application Sub-routes
router.use('/auth', appAuthRoutes);
router.use('/profile', appProfileRoutes);
router.use('/academic', appAcademicRoutes);
router.use('/schedule', appScheduleRoutes);
router.use('/attendance', appAttendanceRoutes);
router.use('/homeworks', appHomeworkRoutes);
router.use('/exams', appExamRoutes);
router.use('/doubts', appDoubtRoutes);
router.use('/fees', appFeeRoutes);
router.use('/parent', appParentRoutes);

module.exports = router;
