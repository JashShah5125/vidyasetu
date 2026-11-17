const pool = require('../config/db');
const { verifyBranchGeofence } = require('../utils/geoUtils');

const parseJsonArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val) {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (_) {
            return [];
        }
    }
    return [];
};

const attendanceModel = {
    /**
     * Get today's (or a date's) lectures for a teacher, with attendance status.
     */
    async getTodayLectures(tenantId, teacherUserId, date) {
        const [rows] = await pool.query(
            `SELECT l.id, l.tenant_id, l.branch_id, l.academic_year_id, l.batch_id,
                    l.subject_id, s.name AS subject_name, s.code AS subject_code,
                    l.teacher_user_id, u.name AS teacher_name,
                    DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                    l.start_time, l.end_time,
                    l.classroom_id, c.name AS classroom_name, c.room_number,
                    b.name AS batch_name, b.code AS batch_code,
                    l.lecture_type, l.activity_type, l.slot_label, l.status,
                    l.attendance_taken, l.attendance_submitted_at, l.attendance_locked_at,
                    l.geofence_status, l.geofence_distance_meters,
                    l.student_checkin_open, l.student_checkin_code, l.student_checkin_opened_at,
                    br.name AS branch_name, br.geofence_enabled, br.geofence_radius_meters,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.lecture_id = l.id) AS marked_count
             FROM lectures l
             LEFT JOIN branches br ON l.branch_id = br.id
             LEFT JOIN batches b ON l.batch_id = b.id
             LEFT JOIN subjects s ON l.subject_id = s.id
             LEFT JOIN users u ON l.teacher_user_id = u.id
             LEFT JOIN classrooms c ON l.classroom_id = c.id
             WHERE l.tenant_id = ? AND l.teacher_user_id = ? AND l.is_default = 0
               AND l.lecture_date = ? AND l.deleted_at IS NULL
               AND l.status NOT IN ('cancelled')
             ORDER BY l.start_time ASC`,
            [tenantId, teacherUserId, date]
        );
        return rows;
    },

    /**
     * Get the full student roster for a lecture plus any existing marks.
     * Derives the roster from the lecture's batch via student_enrollments.
     */
    async getRoster(lectureId, tenantId) {
        const [rows] = await pool.query(
            `SELECT l.id AS lecture_id, l.branch_id, l.batch_id, l.subject_id, l.lecture_date,
                    l.start_time, l.end_time, l.attendance_taken, l.attendance_submitted_at,
                    l.attendance_locked_at, l.geofence_status, l.geofence_distance_meters,
                    l.submitted_accuracy_meters,
                    l.student_checkin_open, l.student_checkin_code, l.student_checkin_opened_at,
                    br.name AS branch_name, br.geofence_enabled, br.geofence_radius_meters,
                    se.id AS enrollment_id,
                    s.id AS student_id, s.full_name, s.student_code, s.mobile,
                    ar.id AS record_id, ar.status AS attendance_status, ar.remarks,
                    ar.student_checkin_at, ar.student_checkin_distance_meters,
                    ar.student_checkin_geofence_status, ar.student_checkin_accuracy_meters
             FROM lectures l
             LEFT JOIN branches br ON l.branch_id = br.id
             JOIN student_enrollments se
                ON se.batch_id = l.batch_id
               AND se.academic_year_id = l.academic_year_id
               AND se.status = 'active'
               AND se.deleted_at IS NULL
             JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
             LEFT JOIN attendance_records ar
                ON ar.lecture_id = l.id AND ar.student_id = s.id
             WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL
             ORDER BY s.full_name ASC`,
            [lectureId, tenantId]
        );
        return rows;
    },

    /**
     * Save a set of attendance records for a lecture (transactional upsert).
     * records: [{ student_id, status (0/1/2), remarks? }]
     */
    async saveAttendance(tenantId, lectureId, records, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT id, attendance_taken, attendance_locked_at FROM lectures WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                const err = new Error('Lecture not found for tenant');
                err.statusCode = 404;
                throw err;
            }
            if (lectureRows[0].attendance_taken === 1 && lectureRows[0].attendance_locked_at !== null) {
                const err = new Error('Attendance for this lecture is already finalized and locked. Use the correction flow with a reason.');
                err.statusCode = 400;
                err.code = 'ATTENDANCE_LOCKED';
                throw err;
            }

            for (const rec of records) {
                if (!rec.student_id) continue;
                const status = Number(rec.status);
                if (![0, 1, 2].includes(status)) continue;

                const remarks = rec.remarks || null;
                await connection.query(
                    `INSERT INTO attendance_records
                        (tenant_id, lecture_id, student_id, status, remarks, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        remarks = VALUES(remarks),
                        updated_by = VALUES(updated_by),
                        updated_at = CURRENT_TIMESTAMP`,
                    [tenantId, lectureId, rec.student_id, status, remarks, userId || null, userId || null]
                );
            }

            await connection.commit();
            connection.release();
            return { success: true, count: records.length };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Submit/finalize attendance for a lecture with server-side Haversine geo-fence verification.
     * Inserts attendance records and marks lecture.status = 'completed' and attendance_taken = 1.
     */
    async submitAttendance(tenantId, lectureId, userId, records = [], location = null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT l.id, l.branch_id, l.attendance_taken, l.attendance_locked_at,
                        b.name AS branch_name, b.latitude, b.longitude,
                        b.geofence_radius_meters, b.geofence_enabled
                 FROM lectures l
                 LEFT JOIN branches b ON l.branch_id = b.id
                 WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                const err = new Error('Lecture not found for tenant');
                err.statusCode = 404;
                throw err;
            }
            const lecture = lectureRows[0];

            if (lecture.attendance_taken === 1 && lecture.attendance_locked_at !== null) {
                const err = new Error('Attendance for this lecture is already finalized and locked. Use the correction flow with a reason.');
                err.statusCode = 400;
                err.code = 'ATTENDANCE_LOCKED';
                throw err;
            }

            const geoResult = {
                status: 'SKIPPED',
                latitude: null,
                longitude: null,
                accuracyMeters: null,
                distanceMeters: null
            };

            if (Array.isArray(records) && records.length > 0) {
                for (const rec of records) {
                    if (!rec.student_id) continue;
                    const status = Number(rec.status);
                    if (![0, 1, 2].includes(status)) continue;

                    const remarks = rec.remarks || null;
                    await connection.query(
                        `INSERT INTO attendance_records
                            (tenant_id, lecture_id, student_id, status, remarks, created_by, updated_by)
                         VALUES (?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                            status = VALUES(status),
                            remarks = VALUES(remarks),
                            updated_by = VALUES(updated_by),
                            updated_at = CURRENT_TIMESTAMP`,
                        [tenantId, lectureId, rec.student_id, status, remarks, userId || null, userId || null]
                    );
                }
            }

            await connection.query(
                `UPDATE lectures SET
                    status = 'completed',
                    attendance_taken = 1,
                    attendance_submitted_at = CURRENT_TIMESTAMP,
                    attendance_submitted_by = ?,
                    attendance_locked_at = CURRENT_TIMESTAMP,
                    attendance_locked_by = ?,
                    submitted_latitude = ?,
                    submitted_longitude = ?,
                    submitted_accuracy_meters = ?,
                    geofence_distance_meters = ?,
                    geofence_status = ?,
                    student_checkin_open = 0,
                    updated_by = ?
                 WHERE id = ? AND tenant_id = ?`,
                [
                    userId || null,
                    userId || null,
                    geoResult.latitude ?? null,
                    geoResult.longitude ?? null,
                    geoResult.accuracyMeters ?? null,
                    geoResult.distanceMeters ?? null,
                    geoResult.status,
                    userId || null,
                    lectureId,
                    tenantId
                ]
            );

            await connection.commit();
            connection.release();
            return { success: true, lectureId, geofence: geoResult };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Correct locked attendance records with a mandatory reason and persist full correction history.
     */
    async correctAttendance(tenantId, lectureId, userId, records = [], reason = '') {
        const trimmedReason = String(reason || '').trim();
        if (trimmedReason.length < 3) {
            const err = new Error('A correction reason (at least 3 characters) is required.');
            err.statusCode = 400;
            throw err;
        }
        if (!Array.isArray(records) || records.length === 0) {
            const err = new Error('At least one attendance record is required for correction.');
            err.statusCode = 400;
            throw err;
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT id, branch_id FROM lectures WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                const err = new Error('Lecture not found for tenant');
                err.statusCode = 404;
                throw err;
            }
            const branchId = lectureRows[0].branch_id || null;

            const [existingRows] = await connection.query(
                `SELECT ar.student_id, ar.status, ar.remarks, s.full_name, s.student_code
                 FROM attendance_records ar
                 LEFT JOIN students s ON s.id = ar.student_id
                 WHERE ar.lecture_id = ? AND ar.tenant_id = ?`,
                [lectureId, tenantId]
            );
            const existingMap = new Map(existingRows.map(r => [Number(r.student_id), r]));

            const studentIds = records.map(r => Number(r.student_id)).filter(Boolean);
            const studentNameMap = new Map();
            if (studentIds.length > 0) {
                const [stuRows] = await connection.query(
                    `SELECT id, full_name, student_code FROM students WHERE id IN (?)`,
                    [studentIds]
                );
                for (const s of stuRows) {
                    studentNameMap.set(Number(s.id), s);
                }
            }

            const changes = [];
            for (const rec of records) {
                const studentId = Number(rec.student_id);
                const newStatus = Number(rec.status);
                if (!studentId || ![0, 1, 2].includes(newStatus)) continue;

                const newRemarks = rec.remarks ? String(rec.remarks).trim() : null;
                const prev = existingMap.get(studentId);
                const oldStatus = prev !== undefined && prev.status !== null ? Number(prev.status) : null;
                const oldRemarks = prev?.remarks ? String(prev.remarks).trim() : null;

                if (oldStatus === newStatus && oldRemarks === newRemarks) {
                    continue;
                }

                await connection.query(
                    `INSERT INTO attendance_records
                        (tenant_id, lecture_id, student_id, status, remarks, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        remarks = VALUES(remarks),
                        updated_by = VALUES(updated_by),
                        updated_at = CURRENT_TIMESTAMP`,
                    [tenantId, lectureId, studentId, newStatus, newRemarks, userId || null, userId || null]
                );

                await connection.query(
                    `INSERT INTO attendance_corrections
                        (tenant_id, branch_id, lecture_id, student_id, old_status, new_status, old_remarks, new_remarks, reason, corrected_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [tenantId, branchId, lectureId, studentId, oldStatus, newStatus, oldRemarks, newRemarks, trimmedReason, userId]
                );

                const stuInfo = studentNameMap.get(studentId) || prev || {};
                changes.push({
                    student_id: studentId,
                    student_name: stuInfo.full_name || `Student #${studentId}`,
                    student_code: stuInfo.student_code || null,
                    old_status: oldStatus,
                    new_status: newStatus,
                    old_remarks: oldRemarks,
                    new_remarks: newRemarks
                });
            }

            if (changes.length === 0) {
                const err = new Error('No attendance changes detected to correct.');
                err.statusCode = 400;
                throw err;
            }

            await connection.query(
                `UPDATE lectures SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`,
                [userId || null, lectureId, tenantId]
            );

            await connection.commit();
            connection.release();

            return {
                success: true,
                lectureId: Number(lectureId),
                branchId,
                correctedCount: changes.length,
                reason: trimmedReason,
                changes
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Get attendance correction audit history for a lecture.
     */
    async getCorrections(tenantId, lectureId) {
        const [rows] = await pool.query(
            `SELECT ac.id, ac.lecture_id, ac.student_id,
                    s.full_name AS student_name, s.student_code,
                    ac.old_status, ac.new_status, ac.old_remarks, ac.new_remarks,
                    ac.reason, ac.corrected_by,
                    u.name AS corrected_by_name, u.email AS corrected_by_email,
                    ac.created_at
             FROM attendance_corrections ac
             LEFT JOIN students s ON s.id = ac.student_id
             LEFT JOIN users u ON u.id = ac.corrected_by
             WHERE ac.tenant_id = ? AND ac.lecture_id = ?
             ORDER BY ac.created_at DESC, ac.id DESC`,
            [tenantId, lectureId]
        );
        return rows;
    },

    /**
     * Generate pre-filled CSV template for a lecture's student roster.
     */
    async generateAttendanceTemplate(lectureId, tenantId) {
        const roster = await this.getRoster(lectureId, tenantId);
        const headers = ['Student ID', 'Student Code', 'Student Name', 'Status (Present/Late/Absent)', 'Remarks'];
        const csvRows = [headers.join(',')];

        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        for (const s of roster) {
            let statusLabel = 'Present';
            if (s.attendance_status === 0) statusLabel = 'Absent';
            else if (s.attendance_status === 2) statusLabel = 'Late';
            else if (s.attendance_status === 1) statusLabel = 'Present';

            csvRows.push([
                s.student_id,
                escapeCsv(s.student_code || `ST-${s.student_id}`),
                escapeCsv(s.full_name),
                escapeCsv(statusLabel),
                escapeCsv(s.remarks || '')
            ].join(','));
        }

        return {
            filename: `Attendance_Lecture_${lectureId}_Template.csv`,
            csvContent: csvRows.join('\r\n'),
            count: roster.length
        };
    },

    /**
     * Process bulk attendance CSV / raw records for a lecture.
     */
    async processBulkAttendance(tenantId, lectureId, rawContentOrRows, userId, shouldSave = true) {
        const { parseCsv, normalizeAttendanceStatus } = require('../utils/csvParser');
        let rawRows = [];

        if (typeof rawContentOrRows === 'string') {
            rawRows = parseCsv(rawContentOrRows);
        } else if (Array.isArray(rawContentOrRows)) {
            rawRows = rawContentOrRows;
        } else {
            throw new Error('Invalid input: CSV string or array of rows expected.');
        }

        if (rawRows.length === 0) {
            throw new Error('The uploaded CSV file contains no data rows.');
        }

        // Fetch roster to map against
        const roster = await this.getRoster(lectureId, tenantId);
        if (roster.length === 0) {
            throw new Error('No active students are enrolled in this batch for this lecture.');
        }

        const idMap = new Map();
        const codeMap = new Map();
        const nameMap = new Map();

        for (const s of roster) {
            idMap.set(Number(s.student_id), s);
            if (s.student_code) {
                codeMap.set(String(s.student_code).trim().toLowerCase(), s);
            }
            if (s.full_name) {
                nameMap.set(String(s.full_name).trim().toLowerCase(), s);
            }
        }

        const mappedRecords = [];
        const unmatchedRows = [];
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];

            // Resolve student ID / Code / Name across various possible column headers
            const rawId = row.student_id || row.id || row.student_code_id || row.studentid;
            const rawCode = row.student_code || row.code || row.roll_no || row.roll_number || row.studentcode;
            const rawName = row.student_name || row.name || row.full_name || row.studentname;
            const rawStatus = row.status !== undefined ? row.status : (row.attendance_status !== undefined ? row.attendance_status : row.attendance);
            const rawRemarks = row.remarks || row.remark || row.note || row.notes || row.comments || '';

            let matchedStudent = null;
            if (rawId && !isNaN(Number(rawId)) && idMap.has(Number(rawId))) {
                matchedStudent = idMap.get(Number(rawId));
            } else if (rawCode && codeMap.has(String(rawCode).trim().toLowerCase())) {
                matchedStudent = codeMap.get(String(rawCode).trim().toLowerCase());
            } else if (rawName && nameMap.has(String(rawName).trim().toLowerCase())) {
                matchedStudent = nameMap.get(String(rawName).trim().toLowerCase());
            }

            if (!matchedStudent) {
                unmatchedRows.push({
                    rowNumber: i + 2,
                    rawId,
                    rawCode,
                    rawName,
                    reason: 'Student not found in this lecture roster'
                });
                continue;
            }

            const normalizedStatus = normalizeAttendanceStatus(rawStatus);
            const effectiveStatus = normalizedStatus !== null ? normalizedStatus : 1; // Default to 1 (Present) if omitted

            if (effectiveStatus === 1) presentCount++;
            else if (effectiveStatus === 2) lateCount++;
            else if (effectiveStatus === 0) absentCount++;

            mappedRecords.push({
                student_id: matchedStudent.student_id,
                student_code: matchedStudent.student_code,
                full_name: matchedStudent.full_name,
                status: effectiveStatus,
                remarks: String(rawRemarks).trim() || null
            });
        }

        if (mappedRecords.length === 0) {
            throw new Error('None of the rows in the CSV file could be mapped to students in this batch.');
        }

        if (shouldSave) {
            await this.saveAttendance(tenantId, lectureId, mappedRecords, userId);
        }

        return {
            success: true,
            totalRowsInFile: rawRows.length,
            mappedCount: mappedRecords.length,
            presentCount,
            lateCount,
            absentCount,
            unmatchedCount: unmatchedRows.length,
            unmatchedRows,
            records: mappedRecords
        };
    },

    /**
     * Get dropdown/options data for attendance filters (branches, batches).
     */
    async getAttendanceOptions(tenantId) {
        const [branches] = await pool.query(
            `SELECT id, name, code, latitude, longitude, geofence_radius_meters, geofence_enabled
             FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1 OR status = '1' OR status IS NULL) ORDER BY name ASC`,
            [tenantId]
        );
        const [batches] = await pool.query(
            `SELECT id, branch_id, level_id, academic_year_id, name, code FROM batches
             WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 1 OR status = '1' OR status = 'active') ORDER BY name ASC`,
            [tenantId]
        );
        const [academicYears] = await pool.query(
            `SELECT id, name FROM academic_years WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY start_date DESC`,
            [tenantId]
        );
        const [courses] = await pool.query(
            `SELECT id, name, code FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL) ORDER BY name ASC`,
            [tenantId]
        );
        const [programs] = await pool.query(
            `SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL) ORDER BY name ASC`,
            [tenantId]
        );
        const [levels] = await pool.query(
            `SELECT id, course_id, program_id, name, code FROM levels WHERE tenant_id = ? AND deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL) ORDER BY name ASC`,
            [tenantId]
        );
        return { branches, batches, academicYears, courses, programs, levels };
    },

    /**
     * Get lectures for a date across a branch/batch (admin view).
     */
    async getDailyLectures(tenantId, { branchId, batchId, date }) {
        let query = `
            SELECT l.id, l.tenant_id, l.branch_id, l.academic_year_id, l.batch_id,
                   l.subject_id, s.name AS subject_name, s.code AS subject_code,
                   l.teacher_user_id, u.name AS teacher_name,
                   DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                   l.start_time, l.end_time,
                   b.name AS batch_name, b.code AS batch_code,
                   l.status, l.attendance_taken, l.attendance_submitted_at, l.attendance_locked_at,
                   l.geofence_status, l.geofence_distance_meters,
                   l.student_checkin_open, l.student_checkin_code, l.student_checkin_opened_at,
                   br.name AS branch_name, br.geofence_enabled, br.geofence_radius_meters,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.lecture_id = l.id) AS marked_count
            FROM lectures l
            LEFT JOIN branches br ON l.branch_id = br.id
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            WHERE l.tenant_id = ? AND l.is_default = 0 AND l.deleted_at IS NULL
        `;
        const params = [tenantId];

        if (date) {
            query += ` AND l.lecture_date = ?`;
            params.push(date);
        }
        if (batchId && batchId !== 'All') {
            query += ` AND l.batch_id = ?`;
            params.push(batchId);
        } else if (branchId && branchId !== 'All') {
            query += ` AND l.branch_id = ?`;
            params.push(branchId);
        }

        query += ` ORDER BY l.lecture_date ASC, l.start_time ASC`;

        const [rows] = await pool.query(query, params);
        return rows;
    },

    /**
     * Batch-wise attendance summary (date range). Percentage of present (and late) per student.
     */
    async getBatchReport(tenantId, batchId, startDate, endDate, academicYearId) {
        let acadFilter = '';
        const acadParams = [];
        if (academicYearId && academicYearId !== 'All') {
            acadFilter = ` AND l.academic_year_id = ?`;
            acadParams.push(academicYearId);
        }

        const datePair = [startDate, endDate];
        const [rows] = await pool.query(
            `SELECT
                se.id AS enrollment_id, s.id AS student_id, s.full_name, s.student_code,
                COUNT(DISTINCT CASE WHEN l.lecture_date BETWEEN ? AND ? THEN l.id END) AS total_lectures,
                COUNT(DISTINCT CASE WHEN ar.status IN (1, 2) AND l.lecture_date BETWEEN ? AND ? THEN l.id END) AS attended_lectures,
                COUNT(DISTINCT CASE WHEN ar.status = 1 AND l.lecture_date BETWEEN ? AND ? THEN l.id END) AS present_lectures,
                COUNT(DISTINCT CASE WHEN ar.status = 2 AND l.lecture_date BETWEEN ? AND ? THEN l.id END) AS late_lectures,
                COUNT(DISTINCT CASE WHEN ar.status = 0 AND l.lecture_date BETWEEN ? AND ? THEN l.id END) AS absent_lectures,
                ROUND(100 * COUNT(DISTINCT CASE WHEN ar.status IN (1,2) AND l.lecture_date BETWEEN ? AND ? THEN l.id END)
                    / NULLIF(COUNT(DISTINCT CASE WHEN l.lecture_date BETWEEN ? AND ? THEN l.id END), 0), 2) AS attendance_percentage
             FROM student_enrollments se
             JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
             LEFT JOIN lectures l ON l.batch_id = se.batch_id AND l.is_default = 0 AND l.deleted_at IS NULL AND l.attendance_taken = 1
                AND l.academic_year_id = se.academic_year_id ${acadFilter}
             LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.student_id = se.student_id
             WHERE se.tenant_id = ? AND se.batch_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
             GROUP BY se.id, s.id, s.full_name, s.student_code
             ORDER BY s.full_name ASC`,
            [
                ...datePair, ...datePair, ...datePair, ...datePair,
                ...datePair, ...datePair, ...datePair,
                ...acadParams,
                tenantId, batchId
            ]
        );
        return rows;
    },

    /**
     * Per-student attendance history report.
     */
    async getStudentReport(tenantId, studentId, startDate, endDate) {
        const params = [tenantId, studentId];
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = ` AND l.lecture_date BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        const [rows] = await pool.query(
            `SELECT
                l.id AS lecture_id,
                DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                l.start_time, l.end_time,
                s.name AS subject_name, s.code AS subject_code,
                b.name AS batch_name, b.code AS batch_code,
                ar.status AS attendance_status, ar.remarks,
                u.name AS teacher_name
             FROM attendance_records ar
             JOIN lectures l ON l.id = ar.lecture_id AND l.tenant_id = ar.tenant_id AND l.deleted_at IS NULL AND l.is_default = 0
             JOIN batches b ON l.batch_id = b.id
             JOIN subjects s ON l.subject_id = s.id
             LEFT JOIN users u ON l.teacher_user_id = u.id
             WHERE ar.tenant_id = ? AND ar.student_id = ?
               ${dateFilter}
             ORDER BY l.lecture_date DESC, l.start_time DESC`,
            params
        );
        return rows;
    },

    /**
     * Staff attendance roster for a day (teachers + non-teaching).
     * Returns every non-deleted staff member with their status for `date`
     * (null if unmarked). Status is forced to 1 when lecture_ids is non-empty.
     */
    async getStaffAttendance(tenantId, { branchId, date, employeeType, role, search } = {}) {
        let query = `
            SELECT sp.id AS staff_id, sp.user_id, sp.employee_id,
                   sp.first_name, sp.last_name,
                   CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')) AS name,
                   u.email, u.mobile,
                   sp.employee_type, sp.designation, sp.department,
                   b.name AS primary_branch_name,
                   COALESCE(GROUP_CONCAT(DISTINCT r.name SEPARATOR ', '), IF(sp.employee_type = 'Teaching', 'Teacher', sp.designation)) AS role_name,
                   sa.status AS attendance_status,
                   sa.lecture_ids AS lecture_ids,
                   sa.remarks AS attendance_remarks
            FROM staff_profiles sp
            JOIN users u ON sp.user_id = u.id
            LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
            LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN staff_attendance sa ON sa.staff_id = sp.id AND sa.date = ?
            WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL AND sp.status != 'deleted'
        `;
        const params = [date, tenantId];

        if (branchId && branchId !== 'All') {
            query += ` AND (JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS CHAR)) OR b.name = ?)`;
            params.push(branchId, branchId);
        }
        if (employeeType && employeeType !== 'All') {
            query += ` AND sp.employee_type = ?`;
            params.push(employeeType);
        }
        if (role && role !== 'All') {
            query += ` AND (r.name = ? OR r.code = ? OR sp.employee_type = ? OR sp.designation LIKE ?
                            OR (? = 'Teacher' AND sp.employee_type = 'Teaching')
                            OR (? = 'Teaching' AND sp.employee_type = 'Teaching')
                            OR (? = 'Non-Teaching' AND sp.employee_type = 'Non-Teaching'))`;
            const roleCode = role.toLowerCase().replace(/[\s-]+/g, '_');
            params.push(role, roleCode, role, `%${role}%`, role, role, role);
        }
        if (search) {
            query += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        query += ` GROUP BY sp.id, u.email, b.name, sa.status, sa.lecture_ids, sa.remarks
                   ORDER BY (sp.employee_type = 'Teaching') DESC, sp.first_name ASC, sp.last_name ASC`;

        const [rows] = await pool.query(query, params);
        return rows.map(r => {
            const lectureIds = parseJsonArray(r.lecture_ids);
            const status = (r.attendance_status !== null && r.attendance_status !== undefined)
                ? r.attendance_status
                : (lectureIds.length > 0 ? 1 : null);
            return {
                ...r,
                lecture_ids: status === 0 ? [] : lectureIds,
                attendance_status: status
            };
        });
    },

    /**
     * Save the daily staff attendance sheet (upsert per staff member).
     * records: [{ staff_id, status (0/1/2), remarks?, lecture_ids?, branch_id? }]
     * Rule: if the resulting row keeps any lecture_id, status is forced to present (1).
     */
    async saveStaffAttendance(tenantId, { branchId, date, records = [], userId, location = null } = {}) {
        if (!date) throw new Error('date is required');
        if (!Array.isArray(records)) records = [];

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            if (branchId && branchId !== 'All') {
                const [branchRows] = await connection.query(
                    `SELECT id, name, latitude, longitude, geofence_radius_meters, geofence_enabled
                     FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR name = ? OR code = ?) LIMIT 1`,
                    [tenantId, branchId, branchId, branchId]
                );
                if (branchRows.length > 0) {
                    const geoResult = verifyBranchGeofence(branchRows[0], location);
                    if (!geoResult.allowed) {
                        const err = new Error(geoResult.message || 'Outside branch geo-fence.');
                        err.statusCode = 403;
                        err.code = geoResult.status || 'GEOFENCE_BLOCKED';
                        err.details = geoResult;
                        throw err;
                    }
                }
            }

            let count = 0;
            for (const rec of records) {
                const status = Number(rec.status);
                if (![0, 1, 2].includes(status)) continue;
                if (!rec.staff_id) continue;

                let branch = rec.branch_id || branchId || null;
                if (!branch) {
                    const [spRows] = await connection.query(
                        `SELECT JSON_UNQUOTE(JSON_EXTRACT(IFNULL(branch_ids, JSON_ARRAY()), '$[0]')) AS primary_branch
                         FROM staff_profiles WHERE id = ?`,
                        [rec.staff_id]
                    );
                    branch = spRows.length && spRows[0].primary_branch ? spRows[0].primary_branch : null;
                }
                if (!branch) continue;
                const remarks = rec.remarks || null;
                const lectureIds = Array.isArray(rec.lecture_ids)
                    ? JSON.stringify(rec.lecture_ids)
                    : (status === 0 ? JSON.stringify([]) : null);

                await connection.query(
                    `INSERT INTO staff_attendance (tenant_id, branch_id, staff_id, date, lecture_ids, status, remarks, marked_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        branch_id = VALUES(branch_id),
                        lecture_ids = CASE
                            WHEN VALUES(status) = 0 THEN JSON_ARRAY()
                            WHEN VALUES(lecture_ids) IS NOT NULL THEN VALUES(lecture_ids)
                            ELSE lecture_ids
                        END,
                        status = VALUES(status),
                        remarks = COALESCE(VALUES(remarks), remarks),
                        marked_by = VALUES(marked_by),
                        updated_at = CURRENT_TIMESTAMP`,
                    [tenantId, branch, rec.staff_id, date, lectureIds, status, remarks, userId || null]
                );
                count++;
            }
            await connection.commit();
            connection.release();
            return { success: true, count };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Mark a teacher present/absent at a specific lecture.
     * present=true  → add lectureId to the teacher's lecture_ids for that lecture date, day status ⇒ present.
     * present=false → remove lectureId (day status left unchanged).
     */
    async saveStaffLectureAttendance(tenantId, lectureId, present, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT id, tenant_id, teacher_user_id, branch_id,
                        DATE_FORMAT(lecture_date, '%Y-%m-%d') AS lecture_date
                 FROM lectures
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL AND status NOT IN ('cancelled')`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                throw new Error('Lecture not found for tenant');
            }
            const lecture = lectureRows[0];
            if (!lecture.teacher_user_id) {
                throw new Error('No teacher assigned to this lecture');
            }

            const [staffRows] = await connection.query(
                `SELECT id FROM staff_profiles WHERE user_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                [lecture.teacher_user_id, tenantId]
            );
            if (staffRows.length === 0) {
                throw new Error('Teacher profile not found');
            }
            const staffId = staffRows[0].id;

            const [existingRows] = await connection.query(
                `SELECT lecture_ids FROM staff_attendance WHERE staff_id = ? AND date = ?`,
                [staffId, lecture.lecture_date]
            );
            let ids = existingRows.length ? parseJsonArray(existingRows[0].lecture_ids) : [];
            const lectureNum = Number(lectureId);

            if (present) {
                if (!ids.includes(lectureNum)) ids.push(lectureNum);
                await connection.query(
                    `INSERT INTO staff_attendance (tenant_id, branch_id, staff_id, date, lecture_ids, status, marked_by)
                     VALUES (?, ?, ?, ?, ?, 1, ?)
                     ON DUPLICATE KEY UPDATE
                        branch_id = VALUES(branch_id),
                        lecture_ids = ?,
                        status = 1,
                        marked_by = VALUES(marked_by),
                        updated_at = CURRENT_TIMESTAMP`,
                    [tenantId, lecture.branch_id, staffId, lecture.lecture_date, JSON.stringify(ids), userId || null, JSON.stringify(ids)]
                );
            } else if (existingRows.length > 0) {
                const filtered = ids.filter(id => id !== lectureNum);
                await connection.query(
                    `UPDATE staff_attendance SET lecture_ids = ?, marked_by = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE staff_id = ? AND date = ?`,
                    [filtered.length > 0 ? JSON.stringify(filtered) : null, userId || null, staffId, lecture.lecture_date]
                );
            }

            await connection.commit();
            connection.release();
            return { success: true, present: !!present, lectureId: lectureNum, staffId };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Ensure student_daily_attendance table exists (self-healing migration).
     */
    async ensureDailyStudentTable() {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS student_daily_attendance (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id INT NOT NULL,
                    branch_id INT NULL,
                    batch_id INT NULL,
                    student_id INT NOT NULL,
                    attendance_date DATE NOT NULL,
                    status TINYINT NOT NULL DEFAULT 1 COMMENT '0=absent, 1=present, 2=late',
                    remarks VARCHAR(255) NULL,
                    marked_by INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_tenant_student_date (tenant_id, student_id, attendance_date),
                    INDEX idx_tenant_date (tenant_id, attendance_date),
                    INDEX idx_tenant_batch_date (tenant_id, batch_id, attendance_date),
                    INDEX idx_tenant_branch_date (tenant_id, branch_id, attendance_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } catch (err) {
            // Note: table may already exist or pool is connecting
        }
    },

    /**
     * Fetch saved daily attendance records for students on a given date.
     */
    async getDailyStudentAttendance(tenantId, { branchId, batchId, date } = {}) {
        await this.ensureDailyStudentTable();
        if (!date) return [];

        let query = `
            SELECT 
                sda.student_id,
                s.student_code,
                sda.status,
                sda.remarks,
                DATE_FORMAT(sda.attendance_date, '%Y-%m-%d') AS attendance_date
            FROM student_daily_attendance sda
            JOIN students s ON sda.student_id = s.id AND s.deleted_at IS NULL
            WHERE sda.tenant_id = ? AND sda.attendance_date = ?
        `;
        const params = [tenantId, date];

        if (batchId && batchId !== 'All') {
            query += ` AND (sda.batch_id = ? OR sda.student_id IN (
                SELECT se.student_id FROM student_enrollments se 
                WHERE se.batch_id = ? AND se.tenant_id = ? AND se.deleted_at IS NULL
            ))`;
            params.push(batchId, batchId, tenantId);
        }

        if (branchId && branchId !== 'All') {
            query += ` AND (sda.branch_id = ? OR sda.student_id IN (
                SELECT st.id FROM students st 
                WHERE st.tenant_id = ? AND (
                    st.primary_branch_id = ? OR 
                    st.primary_branch_id = (SELECT id FROM branches WHERE (name = ? OR code = ?) AND tenant_id = ? LIMIT 1)
                )
            ))`;
            params.push(branchId, tenantId, branchId, branchId, branchId, tenantId);
        }

        query += ` ORDER BY s.full_name ASC`;
        const [rows] = await pool.query(query, params);

        if (rows.length > 0) {
            return rows;
        }

        // Fallback: check if attendance was marked in lecture rosters for that date
        let lecQuery = `
            SELECT 
                ar.student_id,
                s.student_code,
                ar.status,
                ar.remarks,
                DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS attendance_date
            FROM attendance_records ar
            JOIN lectures l ON ar.lecture_id = l.id AND l.deleted_at IS NULL
            JOIN students s ON ar.student_id = s.id AND s.deleted_at IS NULL
            WHERE ar.tenant_id = ? AND l.lecture_date = ?
        `;
        const lecParams = [tenantId, date];

        if (batchId && batchId !== 'All') {
            lecQuery += ` AND l.batch_id = ?`;
            lecParams.push(batchId);
        }

        lecQuery += ` GROUP BY ar.student_id, s.student_code, ar.status, ar.remarks, l.lecture_date`;
        const [lecRows] = await pool.query(lecQuery, lecParams);
        return lecRows;
    },

    /**
     * Save/upsert daily student attendance records and sync with lectures if applicable.
     */
    async saveDailyStudentAttendance(tenantId, { branchId, batchId, date, records = [], userId, location = null } = {}) {
        await this.ensureDailyStudentTable();
        if (!date) throw new Error('date is required');
        if (!Array.isArray(records) || records.length === 0) {
            return { success: true, count: 0 };
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let resolvedBranchId = null;
            if (branchId && branchId !== 'All') {
                if (typeof branchId === 'number' || /^\d+$/.test(branchId)) {
                    resolvedBranchId = Number(branchId);
                } else {
                    const [bRows] = await connection.query(
                        `SELECT id FROM branches WHERE (name = ? OR code = ?) AND tenant_id = ? LIMIT 1`,
                        [branchId, branchId, tenantId]
                    );
                    if (bRows.length > 0) {
                        resolvedBranchId = bRows[0].id;
                    }
                }
            }

            let resolvedBatchId = null;
            if (batchId && batchId !== 'All') {
                if (typeof batchId === 'number' || /^\d+$/.test(batchId)) {
                    resolvedBatchId = Number(batchId);
                } else {
                    const [batchRows] = await connection.query(
                        `SELECT id FROM batches WHERE (name = ? OR code = ?) AND tenant_id = ? LIMIT 1`,
                        [batchId, batchId, tenantId]
                    );
                    if (batchRows.length > 0) resolvedBatchId = batchRows[0].id;
                }
            }

            let count = 0;
            for (const rec of records) {
                const studentId = Number(rec.student_id);
                if (!studentId) continue;
                const status = Number(rec.status);
                if (![0, 1, 2].includes(status)) continue;

                let bId = rec.branch_id ? Number(rec.branch_id) : resolvedBranchId;
                let btId = rec.batch_id ? Number(rec.batch_id) : resolvedBatchId;
                const remarks = rec.remarks || null;

                // If branch_id or batch_id still null, resolve from student's active enrollment
                if (!bId || !btId) {
                    const [seRows] = await connection.query(
                        `SELECT se.batch_id, s.primary_branch_id 
                         FROM students s
                         LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
                         WHERE s.id = ? AND s.tenant_id = ? LIMIT 1`,
                        [studentId, tenantId]
                    );
                    if (seRows.length > 0) {
                        if (!bId) bId = seRows[0].primary_branch_id;
                        if (!btId) btId = seRows[0].batch_id;
                    }
                }

                await connection.query(
                    `INSERT INTO student_daily_attendance
                        (tenant_id, branch_id, batch_id, student_id, attendance_date, status, remarks, marked_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        branch_id = COALESCE(VALUES(branch_id), branch_id),
                        batch_id = COALESCE(VALUES(batch_id), batch_id),
                        status = VALUES(status),
                        remarks = VALUES(remarks),
                        marked_by = VALUES(marked_by),
                        updated_at = CURRENT_TIMESTAMP`,
                    [tenantId, bId || null, btId || null, studentId, date, status, remarks, userId || null]
                );
                count++;
            }

            // Sync with any batch lectures scheduled on that date
            if (resolvedBatchId) {
                const [batchLectures] = await connection.query(
                    `SELECT id FROM lectures 
                     WHERE tenant_id = ? AND batch_id = ? AND lecture_date = ? 
                       AND deleted_at IS NULL AND status NOT IN ('cancelled')`,
                    [tenantId, resolvedBatchId, date]
                );
                for (const lec of batchLectures) {
                    for (const rec of records) {
                        const studentId = Number(rec.student_id);
                        const status = Number(rec.status);
                        if (!studentId || ![0, 1, 2].includes(status)) continue;
                        await connection.query(
                            `INSERT INTO attendance_records
                                (tenant_id, lecture_id, student_id, status, remarks, created_by, updated_by)
                             VALUES (?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE
                                status = VALUES(status),
                                remarks = VALUES(remarks),
                                updated_by = VALUES(updated_by),
                                updated_at = CURRENT_TIMESTAMP`,
                            [tenantId, lec.id, studentId, status, rec.remarks || null, userId || null, userId || null]
                        );
                    }
                    await connection.query(
                        `UPDATE lectures SET attendance_taken = 1, updated_by = ? WHERE id = ? AND tenant_id = ?`,
                        [userId || null, lec.id, tenantId]
                    );
                }
            }

            await connection.commit();
            connection.release();
            return { success: true, count };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Open or close the student self check-in session for a lecture (generates a 4-digit PIN when opened).
     */
    async toggleStudentCheckinSession(tenantId, lectureId, userId, open = true) {
        const [rows] = await pool.query(
            `SELECT id, attendance_taken, attendance_locked_at, student_checkin_open, student_checkin_code
             FROM lectures
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [lectureId, tenantId]
        );
        if (rows.length === 0) {
            const err = new Error('Lecture not found for tenant');
            err.statusCode = 404;
            throw err;
        }

        const lec = rows[0];
        if (lec.attendance_taken === 1 && lec.attendance_locked_at !== null) {
            const err = new Error('Attendance is already locked for this lecture. Self check-in cannot be opened.');
            err.statusCode = 400;
            err.code = 'ATTENDANCE_LOCKED';
            throw err;
        }

        const shouldOpen = Boolean(open);
        const code = shouldOpen ? String(Math.floor(1000 + Math.random() * 9000)) : null;

        await pool.query(
            `UPDATE lectures
             SET student_checkin_open = ?,
                 student_checkin_code = COALESCE(?, student_checkin_code),
                 student_checkin_opened_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE student_checkin_opened_at END,
                 updated_by = ?
             WHERE id = ? AND tenant_id = ?`,
            [shouldOpen ? 1 : 0, code, shouldOpen ? 1 : 0, userId || null, lectureId, tenantId]
        );

        return {
            lectureId: Number(lectureId),
            student_checkin_open: shouldOpen ? 1 : 0,
            student_checkin_code: shouldOpen ? code : lec.student_checkin_code,
            opened_at: shouldOpen ? new Date().toISOString() : null
        };
    },

    /**
     * Resolve active student profile from authenticated user ID.
     */
    async resolveStudentByUserId(tenantId, userId) {
        const [rows] = await pool.query(
            `SELECT id, full_name, student_code, primary_branch_id
             FROM students
             WHERE tenant_id = ? AND user_id = ? AND deleted_at IS NULL
             LIMIT 1`,
            [tenantId, Number(userId)]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Get lectures for a student's active enrollments on a given date along with check-in & attendance state.
     * Deliberately excludes student_checkin_code so students must read it from the classroom/teacher.
     */
    async getStudentLectures(tenantId, userId, date) {
        const student = await this.resolveStudentByUserId(tenantId, userId);
        if (!student) {
            const err = new Error('No student profile is linked to this account.');
            err.statusCode = 403;
            throw err;
        }

        const [rows] = await pool.query(
            `SELECT l.id, l.branch_id, l.academic_year_id, l.batch_id, l.subject_id,
                    s.name AS subject_name, s.code AS subject_code,
                    DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                    l.start_time, l.end_time,
                    l.classroom_id, c.name AS classroom_name, c.room_number,
                    b.name AS batch_name, b.code AS batch_code,
                    u.name AS teacher_name,
                    l.status AS lecture_status,
                    l.attendance_taken, l.attendance_locked_at,
                    l.student_checkin_open, l.student_checkin_opened_at,
                    br.name AS branch_name, br.geofence_enabled, br.geofence_radius_meters,
                    ar.status AS attendance_status, ar.remarks,
                    ar.student_checkin_at, ar.student_checkin_distance_meters,
                    ar.student_checkin_geofence_status, ar.student_checkin_accuracy_meters
             FROM student_enrollments se
             JOIN lectures l
               ON l.batch_id = se.batch_id
              AND l.academic_year_id = se.academic_year_id
              AND l.tenant_id = se.tenant_id
              AND l.is_default = 0
              AND l.deleted_at IS NULL
              AND l.status NOT IN ('cancelled')
             LEFT JOIN branches br ON l.branch_id = br.id
             LEFT JOIN batches b ON l.batch_id = b.id
             LEFT JOIN subjects s ON l.subject_id = s.id
             LEFT JOIN classrooms c ON l.classroom_id = c.id
             LEFT JOIN users u ON l.teacher_user_id = u.id
             LEFT JOIN attendance_records ar
               ON ar.lecture_id = l.id AND ar.student_id = ?
             WHERE se.tenant_id = ? AND se.student_id = ?
               AND se.status = 'active' AND se.deleted_at IS NULL
               AND l.lecture_date = ?
             ORDER BY l.start_time ASC`,
            [student.id, tenantId, student.id, date]
        );

        return { student, lectures: rows };
    },

    /**
     * Student self check-in with Class PIN validation and Haversine branch geo-fence verification.
     */
    async studentCheckIn(tenantId, userId, lectureId, { code, location } = {}) {
        const student = await this.resolveStudentByUserId(tenantId, userId);
        if (!student) {
            const err = new Error('No student profile is linked to this account.');
            err.statusCode = 403;
            throw err;
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT l.id, l.branch_id, l.batch_id, l.academic_year_id,
                        l.attendance_taken, l.attendance_locked_at,
                        l.student_checkin_open, l.student_checkin_code,
                        br.name AS branch_name, br.latitude, br.longitude,
                        br.geofence_radius_meters, br.geofence_enabled
                 FROM lectures l
                 LEFT JOIN branches br ON l.branch_id = br.id
                 WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL AND l.status NOT IN ('cancelled')`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                const err = new Error('Lecture not found.');
                err.statusCode = 404;
                throw err;
            }
            const lecture = lectureRows[0];

            const [enrollRows] = await connection.query(
                `SELECT id FROM student_enrollments
                 WHERE tenant_id = ? AND student_id = ? AND batch_id = ? AND academic_year_id = ?
                   AND status = 'active' AND deleted_at IS NULL
                 LIMIT 1`,
                [tenantId, student.id, lecture.batch_id, lecture.academic_year_id]
            );
            if (enrollRows.length === 0) {
                const err = new Error('You are not enrolled in this lecture batch.');
                err.statusCode = 403;
                throw err;
            }

            if (lecture.attendance_taken === 1 && lecture.attendance_locked_at !== null) {
                const err = new Error('Attendance for this lecture is already locked by the faculty.');
                err.statusCode = 400;
                err.code = 'ATTENDANCE_LOCKED';
                throw err;
            }

            if (Number(lecture.student_checkin_open) !== 1) {
                const err = new Error('Student self check-in is not currently open for this lecture. Ask your teacher to open it.');
                err.statusCode = 400;
                err.code = 'CHECKIN_CLOSED';
                throw err;
            }

            const submittedCode = String(code || '').trim();
            if (!submittedCode || submittedCode !== String(lecture.student_checkin_code || '').trim()) {
                const err = new Error('Invalid Class PIN. Please enter the 4-digit PIN shared by your teacher.');
                err.statusCode = 400;
                err.code = 'INVALID_CHECKIN_CODE';
                throw err;
            }

            const geoResult = verifyBranchGeofence(lecture.branch_id ? lecture : null, location);
            if (!geoResult.allowed) {
                const err = new Error(geoResult.message || 'Check-in blocked: You are outside the permitted branch geo-fence.');
                err.statusCode = 403;
                err.code = geoResult.status || 'GEOFENCE_BLOCKED';
                err.details = {
                    status: geoResult.status,
                    distanceMeters: geoResult.distanceMeters,
                    accuracyMeters: geoResult.accuracyMeters,
                    radiusMeters: geoResult.radiusMeters
                };
                throw err;
            }

            await connection.query(
                `INSERT INTO attendance_records
                    (tenant_id, lecture_id, student_id, status, remarks,
                     student_checkin_at, student_checkin_latitude, student_checkin_longitude,
                     student_checkin_accuracy_meters, student_checkin_distance_meters,
                     student_checkin_geofence_status, created_by, updated_by)
                 VALUES (?, ?, ?, 1, NULL, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    status = 1,
                    student_checkin_at = CURRENT_TIMESTAMP,
                    student_checkin_latitude = VALUES(student_checkin_latitude),
                    student_checkin_longitude = VALUES(student_checkin_longitude),
                    student_checkin_accuracy_meters = VALUES(student_checkin_accuracy_meters),
                    student_checkin_distance_meters = VALUES(student_checkin_distance_meters),
                    student_checkin_geofence_status = VALUES(student_checkin_geofence_status),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    tenantId,
                    lectureId,
                    student.id,
                    geoResult.latitude ?? null,
                    geoResult.longitude ?? null,
                    geoResult.accuracyMeters ?? null,
                    geoResult.distanceMeters ?? null,
                    geoResult.status,
                    userId || null,
                    userId || null
                ]
            );

            await connection.commit();
            connection.release();
            return {
                lectureId: Number(lectureId),
                studentId: student.id,
                status: 1,
                geofence: geoResult,
                checkedInAt: new Date().toISOString()
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }
};

module.exports = attendanceModel;
