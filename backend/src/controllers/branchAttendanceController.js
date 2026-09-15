const pool = require('../config/db');
const attendanceModel = require('../models/attendanceModel');
const studentModel = require('../models/studentModel');
const timetableAccessService = require('../services/timetableAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const resolveUserId = (req) => req.user && (req.user.userId || req.user.id);

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message, code: error.code });
    }
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
};

/**
 * 1. GET /api/branch/attendance/options
 * Returns metadata and dropdown options strictly scoped to the authenticated branch
 */
const getAttendanceOptions = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH' && !accessContext.authorizedBranchId) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: No authorized branch associated with your account.'
            });
        }

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? parseInt(req.query.branchId) : 1);
        const academicOpts = await studentModel.getAcademicOptions(tenantId, { scope: 'BRANCH', authorizedBranchId: branchId });

        res.status(200).json({
            status: 'success',
            data: {
                branch: academicOpts.branch || { id: branchId, name: 'Branch' },
                branches: academicOpts.branches || [],
                courses: academicOpts.courses || [],
                programs: academicOpts.programs || [],
                levels: academicOpts.levels || [],
                batches: academicOpts.batches || [],
                academicYears: academicOpts.academicYears || []
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch attendance options:');
    }
};

/**
 * 2. GET /api/branch/attendance/lectures/daily
 * Get daily lectures strictly scoped to the authenticated branch
 */
const getDailyLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? parseInt(req.query.branchId) : 1);
        const { batchId, date } = req.query;

        if (batchId && batchId !== 'All') {
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, batchId);
        }

        const lectures = await attendanceModel.getDailyLectures(tenantId, { branchId, batchId, date });
        res.status(200).json({ status: 'success', data: lectures });
    } catch (error) {
        handleError(res, error, 'Error fetching daily branch lectures:');
    }
};

/**
 * 3. GET /api/branch/attendance/roster/:lectureId
 * Get student roster for a lecture after verifying branch ownership
 */
const getRoster = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;

        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        }

        const roster = await attendanceModel.getRoster(lectureId, tenantId);
        res.status(200).json({ status: 'success', data: roster });
    } catch (error) {
        handleError(res, error, 'Error fetching lecture attendance roster:');
    }
};

/**
 * 4. POST /api/branch/attendance/save/:lectureId
 * Save attendance draft for a lecture
 */
const saveAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;
        const { records } = req.body;

        if (!Array.isArray(records)) {
            return res.status(400).json({ status: 'error', message: 'records array required' });
        }

        let lecture = null;
        if (accessContext.authorizedBranchId) {
            lecture = await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        } else {
            const [rows] = await pool.query('SELECT * FROM lectures WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL', [Number(lectureId), tenantId]);
            if (!rows.length) {
                return res.status(404).json({ status: 'error', message: 'Lecture not found' });
            }
            lecture = rows[0];
        }

        if (lecture.attendance_taken === 1 && lecture.attendance_locked_at !== null) {
            return res.status(400).json({
                status: 'error',
                message: 'Attendance for this lecture is already finalized and locked. Edits are not permitted.'
            });
        }

        // Validate all submitted student IDs belong to the lecture's batch
        const studentIds = records.map(r => Number(r.student_id)).filter(Boolean);
        if (studentIds.length > 0) {
            const [enrolled] = await pool.query(
                `SELECT student_id FROM student_enrollments 
                 WHERE tenant_id = ? AND batch_id = ? AND academic_year_id = ? 
                   AND status = 'active' AND deleted_at IS NULL AND student_id IN (?)`,
                [tenantId, lecture.batch_id, lecture.academic_year_id, studentIds]
            );
            const validSet = new Set(enrolled.map(e => Number(e.student_id)));
            for (const sId of studentIds) {
                if (!validSet.has(sId)) {
                    return res.status(403).json({
                        status: 'error',
                        message: `Forbidden: Student ID ${sId} is not actively enrolled in batch ${lecture.batch_id} for this lecture.`
                    });
                }
            }
        }

        const result = await attendanceModel.saveAttendance(tenantId, lectureId, records, resolveUserId(req));
        res.status(200).json({ status: 'success', message: 'Attendance draft saved successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error saving attendance draft:');
    }
};

/**
 * 5. POST /api/branch/attendance/submit/:lectureId
 * Finalize, submit and lock attendance for a lecture
 */
const submitAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;
        const { records } = req.body;

        let lecture = null;
        if (accessContext.authorizedBranchId) {
            lecture = await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        } else {
            const [rows] = await pool.query('SELECT * FROM lectures WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL', [Number(lectureId), tenantId]);
            if (!rows.length) {
                return res.status(404).json({ status: 'error', message: 'Lecture not found' });
            }
            lecture = rows[0];
        }

        if (lecture.attendance_taken === 1 && lecture.attendance_locked_at !== null) {
            return res.status(400).json({
                status: 'error',
                message: 'Attendance for this lecture has already been submitted and locked.'
            });
        }

        if (Array.isArray(records) && records.length > 0) {
            const studentIds = records.map(r => Number(r.student_id)).filter(Boolean);
            const [enrolled] = await pool.query(
                `SELECT student_id FROM student_enrollments 
                 WHERE tenant_id = ? AND batch_id = ? AND academic_year_id = ? 
                   AND status = 'active' AND deleted_at IS NULL AND student_id IN (?)`,
                [tenantId, lecture.batch_id, lecture.academic_year_id, studentIds]
            );
            const validSet = new Set(enrolled.map(e => Number(e.student_id)));
            for (const sId of studentIds) {
                if (!validSet.has(sId)) {
                    return res.status(403).json({
                        status: 'error',
                        message: `Forbidden: Student ID ${sId} is not actively enrolled in batch ${lecture.batch_id}.`
                    });
                }
            }
        }

        const result = await attendanceModel.submitAttendance(tenantId, lectureId, resolveUserId(req), records || []);
        res.status(200).json({ status: 'success', message: 'Attendance submitted and locked successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error submitting attendance:');
    }
};

/**
 * 5b. GET /api/branch/attendance/template/:lectureId
 * Download pre-filled CSV template for a lecture's student roster
 */
const getTemplate = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;

        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        }

        const { filename, csvContent } = await attendanceModel.generateAttendanceTemplate(lectureId, tenantId);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    } catch (error) {
        handleError(res, error, 'Error generating branch attendance template:');
    }
};

/**
 * 5c. POST /api/branch/attendance/bulk-upload/:lectureId
 * Bulk upload and process attendance via CSV file or raw array
 */
const bulkUpload = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;
        const userId = resolveUserId(req);

        let lecture = null;
        if (accessContext.authorizedBranchId) {
            lecture = await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        } else {
            const [rows] = await pool.query('SELECT * FROM lectures WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL', [Number(lectureId), tenantId]);
            if (!rows.length) {
                return res.status(404).json({ status: 'error', message: 'Lecture not found' });
            }
            lecture = rows[0];
        }

        if (lecture.attendance_taken === 1 && lecture.attendance_locked_at !== null) {
            return res.status(400).json({
                status: 'error',
                message: 'Attendance for this lecture is already finalized and locked. Bulk upload is not permitted.'
            });
        }

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
        handleError(res, error, 'Error processing branch bulk attendance:');
    }
};

/**
 * 6. GET /api/branch/attendance/staff
 * Get staff attendance roster for a day in the authorized branch
 */
const getStaffAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? parseInt(req.query.branchId) : 1);
        const { employeeType, role, search, date } = req.query;

        if (!date) {
            return res.status(400).json({ status: 'error', message: 'date is required' });
        }

        const roster = await attendanceModel.getStaffAttendance(tenantId, { branchId, employeeType, role, search, date });
        res.status(200).json({ status: 'success', data: roster });
    } catch (error) {
        handleError(res, error, 'Error fetching branch staff attendance:');
    }
};

/**
 * 7. POST /api/branch/attendance/staff/save
 * Save daily staff attendance for the authorized branch
 */
const saveStaffAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);

        const branchId = accessContext.authorizedBranchId || (req.body.branchId ? parseInt(req.body.branchId) : 1);
        const { date, records } = req.body;

        if (!date) {
            return res.status(400).json({ status: 'error', message: 'date is required' });
        }
        if (!Array.isArray(records)) {
            return res.status(400).json({ status: 'error', message: 'records array required' });
        }

        // Validate each staff member belongs to or is authorized for the branch
        const staffIds = records.map(r => Number(r.staff_id)).filter(Boolean);
        if (staffIds.length > 0) {
            const [staffRows] = await pool.query(
                `SELECT sp.id, sp.branch_ids, sp.user_id 
                 FROM staff_profiles sp
                 WHERE sp.tenant_id = ? AND sp.id IN (?) AND sp.deleted_at IS NULL`,
                [tenantId, staffIds]
            );

            for (const sRow of staffRows) {
                let parsedBranchIds = [];
                try {
                    parsedBranchIds = typeof sRow.branch_ids === 'string' ? JSON.parse(sRow.branch_ids) : (sRow.branch_ids || []);
                } catch (_) {
                    parsedBranchIds = [];
                }
                const hasBranch = parsedBranchIds.map(Number).includes(Number(branchId));
                if (!hasBranch) {
                    const [access] = await pool.query(
                        `SELECT 1 FROM user_branch_access WHERE user_id = ? AND branch_id = ? LIMIT 1`,
                        [sRow.user_id, Number(branchId)]
                    );
                    if (!access.length) {
                        return res.status(403).json({
                            status: 'error',
                            message: `Forbidden: Staff ID ${sRow.id} is not associated with authorized branch ID ${branchId}.`
                        });
                    }
                }
            }
        }

        const result = await attendanceModel.saveStaffAttendance(tenantId, { branchId, date, records, userId: resolveUserId(req) });
        res.status(200).json({ status: 'success', message: 'Staff attendance saved successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error saving branch staff attendance:');
    }
};

/**
 * 8. POST /api/branch/attendance/staff/lecture/:lectureId
 * Update teacher attendance for a specific lecture
 */
const saveStaffLectureAttendance = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { lectureId } = req.params;
        const { present } = req.body;

        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateLectureInBranch(tenantId, accessContext.authorizedBranchId, lectureId);
        }

        const result = await attendanceModel.saveStaffLectureAttendance(tenantId, lectureId, !!present, resolveUserId(req));
        res.status(200).json({ status: 'success', message: 'Teacher lecture attendance updated', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating staff lecture attendance:');
    }
};

/**
 * 9. GET /api/branch/attendance/report/batch/:batchId
 * Batch-wise attendance summary for a batch in the authorized branch
 */
const getBatchReport = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId } = req.params;
        const { startDate, endDate, academicYearId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ status: 'error', message: 'startDate and endDate are required' });
        }

        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, accessContext.authorizedBranchId, batchId);
        }

        const report = await attendanceModel.getBatchReport(tenantId, batchId, startDate, endDate, academicYearId);
        res.status(200).json({ status: 'success', data: report });
    } catch (error) {
        handleError(res, error, 'Error fetching batch attendance report:');
    }
};

/**
 * 10. GET /api/branch/attendance/report/student/:studentId
 * Student attendance report after verifying branch enrollment
 */
const getStudentReport = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;

        if (accessContext.authorizedBranchId) {
            const [enrollments] = await pool.query(
                `SELECT se.id FROM student_enrollments se 
                 JOIN batches b ON se.batch_id = b.id 
                 WHERE se.student_id = ? AND se.tenant_id = ? AND b.branch_id = ? 
                   AND se.deleted_at IS NULL LIMIT 1`,
                [Number(studentId), tenantId, Number(accessContext.authorizedBranchId)]
            );
            if (!enrollments.length) {
                return res.status(403).json({
                    status: 'error',
                    message: `Forbidden: Student ID ${studentId} does not have an enrollment in your authorized branch.`
                });
            }
        }

        const report = await attendanceModel.getStudentReport(tenantId, studentId, startDate, endDate);
        res.status(200).json({ status: 'success', data: report });
    } catch (error) {
        handleError(res, error, 'Error fetching student attendance report:');
    }
};

module.exports = {
    getAttendanceOptions,
    getDailyLectures,
    getRoster,
    saveAttendance,
    submitAttendance,
    getTemplate,
    bulkUpload,
    getStaffAttendance,
    saveStaffAttendance,
    saveStaffLectureAttendance,
    getBatchReport,
    getStudentReport
};
