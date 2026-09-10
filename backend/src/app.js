const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const billingRoutes = require('./routes/billingRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const smsTemplateRoutes = require('./routes/smsTemplateRoutes');
const whatsappTemplateRoutes = require('./routes/whatsappTemplateRoutes');
const courseRoutes = require('./routes/courseRoutes');
const branchRoutes = require('./routes/branchRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const feeRoutes = require('./routes/feeRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const instituteRoutes = require('./routes/instituteRoutes');
const staffRoutes = require('./routes/staffRoutes');
const batchRoutes = require('./routes/batchRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingRoutes = require('./routes/settingRoutes');
const systemConfigurationRoutes = require('./routes/systemConfigurationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const platformSettingsRoutes = require('./routes/platformSettingsRoutes');
const studentRoutes = require('./routes/studentRoutes');
const branchStudentRoutes = require('./routes/branchStudentRoutes');
const branchStaffRoutes = require('./routes/branchStaffRoutes');
const branchFeeRoutes = require('./routes/branchFeeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const branchTimetableRoutes = require('./routes/branchTimetableRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const branchHomeworkRoutes = require('./routes/branchHomeworkRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const branchAttendanceRoutes = require('./routes/branchAttendanceRoutes');
const teacherScheduleRoutes = require('./routes/teacherScheduleRoutes');
const lectureRequestRoutes = require('./routes/lectureRequestRoutes');

// Basic Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running smoothly' });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/tenants', tenantRoutes);
app.use('/api/admin/plans', planRoutes);
app.use('/api/admin/subscriptions', subscriptionRoutes);
app.use('/api/admin/billing', billingRoutes);
app.use('/api/admin/email-templates', emailTemplateRoutes);
app.use('/api/admin/sms-templates', smsTemplateRoutes);
app.use('/api/admin/whatsapp-templates', whatsappTemplateRoutes);
app.use('/api/admin/platform-settings', platformSettingsRoutes);
app.use('/api/admin/courses', courseRoutes);
app.use('/api/admin/branches', branchRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/bundles', bundleRoutes);
app.use('/api/admin/fee-plans', feeRoutes);
app.use('/api/branch/fees', branchFeeRoutes);
app.use('/api/admin/classrooms', classroomRoutes);
app.use('/api/admin/staff', staffRoutes);
app.use('/api/branch/staff', branchStaffRoutes);
app.use('/api/admin/batches', batchRoutes);
app.use('/api/admin/homeworks', homeworkRoutes.teacherRouter);
app.use('/api/branch/homeworks', branchHomeworkRoutes);
app.use('/api/student/homework', homeworkRoutes.studentRouter);
app.use('/api/admin/students', studentRoutes);
app.use('/api/branch/students', branchStudentRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/admin/timetable', timetableRoutes);
app.use('/api/branch/timetable', branchTimetableRoutes);
app.use('/api/teacher/schedule', teacherScheduleRoutes);
app.use('/api/admin/lecture-requests', lectureRequestRoutes);
app.use('/api/admin/attendance', attendanceRoutes);
app.use('/api/branch/attendance', branchAttendanceRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/settings', settingRoutes);
app.use('/api/admin/system-configurations', systemConfigurationRoutes);
app.use('/api/admin/support', supportRoutes);
app.use('/api/branch/support', supportRoutes);
app.use('/api/institute/support', supportRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/institute', instituteRoutes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

module.exports = app;

// force restart trigger 2
