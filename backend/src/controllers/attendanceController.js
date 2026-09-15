const attendanceModel = require('../models/attendanceModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;
const resolveUserId = (req) => req.user && req.user.userId;

const getAttendanceOptions = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const options = await attendanceModel.getAttendanceOptions(tenantId);
        res.status(200).json({ status: 'success', data: options });
    } catch (error) {
        console.error('Error fetching attendance options:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch attendance options' });
    }
};

const getTodayLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const teacherUserId = req.query.teacherId || resolveUserId(req);
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        if (!teacherUserId) {
            return res.status(400).json({ status: 'error', message: 'teacherId is required' });
        }

        const lectures = await attendanceModel.getTodayLectures(tenantId, teacherUserId, date);
        res.status(200).json({ status: 'success', data: lectures });
    } catch (error) {
        console.error('Error fetching today lectures:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch lectures' });
    }
};

const getDailyLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, batchId, date } = req.query;
        const lectures = await attendanceModel.getDailyLectures(tenantId, { branchId, batchId, date });
        res.status(200).json({ status: 'success', data: lectures });
    } catch (error) {
        console.error('Error fetching daily lectures:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch lectures' });
    }
};

const getRoster = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const roster = await attendanceModel.getRoster(lectureId, tenantId);
        res.status(200).json({ status: 'success', data: roster });
    } catch (error) {
        console.error('Error fetching roster:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch roster' });
    }
};

const saveAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const { records } = req.body;

        if (!Array.isArray(records)) {
            return res.status(400).json({ status: 'error', message: 'records array required' });
        }

        const result = await attendanceModel.saveAttendance(tenantId, lectureId, records, resolveUserId(req));
        res.status(200).json({ status: 'success', message: 'Attendance saved successfully', data: result });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to save attendance' });
    }
};

const submitAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const { records } = req.body;
        const result = await attendanceModel.submitAttendance(tenantId, lectureId, resolveUserId(req), records);
        res.status(200).json({ status: 'success', message: 'Attendance submitted successfully', data: result });
    } catch (error) {
        console.error('Error submitting attendance:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to submit attendance' });
    }
};

const getTemplate = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const { filename, csvContent } = await attendanceModel.generateAttendanceTemplate(lectureId, tenantId);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Error generating attendance template:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to generate attendance template' });
    }
};

const bulkUpload = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const userId = resolveUserId(req);
        const shouldSave = req.query.dryRun !== 'true' && req.body.dryRun !== true;

        let content = null;
        if (req.file && req.file.buffer) {
            content = req.file.buffer.toString('utf-8');
        } else if (req.body && req.body.csv) {
            content = req.body.csv;
        } else if (req.body && Array.isArray(req.body.records)) {
            content = req.body.records;
        } else {
            return res.status(400).json({ status: 'error', message: 'CSV file or content is required.' });
        }

        const result = await attendanceModel.processBulkAttendance(tenantId, lectureId, content, userId, shouldSave);
        res.status(200).json({ status: 'success', message: 'Bulk attendance processed successfully', data: result });
    } catch (error) {
        console.error('Error processing bulk attendance:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to process bulk attendance' });
    }
};

const getBatchReport = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId } = req.params;
        const { startDate, endDate, academicYearId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ status: 'error', message: 'startDate and endDate are required' });
        }

        const report = await attendanceModel.getBatchReport(tenantId, batchId, startDate, endDate, academicYearId);
        res.status(200).json({ status: 'success', data: report });
    } catch (error) {
        console.error('Error fetching batch report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch batch report' });
    }
};

const getStudentReport = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;
        const report = await attendanceModel.getStudentReport(tenantId, studentId, startDate, endDate);
        res.status(200).json({ status: 'success', data: report });
    } catch (error) {
        console.error('Error fetching student report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch student report' });
    }
};

const getStaffAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, employeeType, role, search, date } = req.query;
        if (!date) {
            return res.status(400).json({ status: 'error', message: 'date is required' });
        }
        const roster = await attendanceModel.getStaffAttendance(tenantId, { branchId, employeeType, role, search, date });
        res.status(200).json({ status: 'success', data: roster });
    } catch (error) {
        console.error('Error fetching staff attendance:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch staff attendance' });
    }
};

const saveStaffAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, date, records } = req.body;
        if (!date) {
            return res.status(400).json({ status: 'error', message: 'date is required' });
        }
        if (!Array.isArray(records)) {
            return res.status(400).json({ status: 'error', message: 'records array required' });
        }
        const result = await attendanceModel.saveStaffAttendance(tenantId, { branchId, date, records, userId: resolveUserId(req) });
        res.status(200).json({ status: 'success', message: 'Staff attendance saved successfully', data: result });
    } catch (error) {
        console.error('Error saving staff attendance:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to save staff attendance' });
    }
};

const saveStaffLectureAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { lectureId } = req.params;
        const { present } = req.body;
        const result = await attendanceModel.saveStaffLectureAttendance(tenantId, lectureId, !!present, resolveUserId(req));
        res.status(200).json({ status: 'success', message: 'Teacher lecture attendance updated', data: result });
    } catch (error) {
        console.error('Error saving staff lecture attendance:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to update teacher lecture attendance' });
    }
};

module.exports = {
    getAttendanceOptions,
    getTodayLectures,
    getDailyLectures,
    getRoster,
    saveAttendance,
    submitAttendance,
    getTemplate,
    bulkUpload,
    getBatchReport,
    getStudentReport,
    getStaffAttendance,
    saveStaffAttendance,
    saveStaffLectureAttendance
};
