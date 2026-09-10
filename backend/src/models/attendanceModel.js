const pool = require('../config/db');

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
                    l.attendance_taken, l.attendance_submitted_at,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.lecture_id = l.id) AS marked_count
             FROM lectures l
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
            `SELECT l.id AS lecture_id, l.batch_id, l.subject_id, l.lecture_date,
                    l.start_time, l.end_time, l.attendance_taken, l.attendance_submitted_at,
                    se.id AS enrollment_id,
                    s.id AS student_id, s.full_name, s.student_code, s.mobile,
                    ar.id AS record_id, ar.status AS attendance_status, ar.remarks
             FROM lectures l
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
                `SELECT id FROM lectures WHERE id = ? AND tenant_id = ?`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                throw new Error('Lecture not found for tenant');
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
     * Submit/finalize attendance for a lecture.
     * Inserts attendance records and marks lecture.status = 'completed' and attendance_taken = 1.
     */
    async submitAttendance(tenantId, lectureId, userId, records = []) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [lectureRows] = await connection.query(
                `SELECT id FROM lectures WHERE id = ? AND tenant_id = ?`,
                [lectureId, tenantId]
            );
            if (lectureRows.length === 0) {
                throw new Error('Lecture not found for tenant');
            }

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
                    updated_by = ?
                 WHERE id = ? AND tenant_id = ?`,
                [userId || null, userId || null, userId || null, lectureId, tenantId]
            );

            await connection.commit();
            connection.release();
            return { success: true, lectureId };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    /**
     * Get dropdown/options data for attendance filters (branches, batches).
     */
    async getAttendanceOptions(tenantId) {
        const [branches] = await pool.query(
            `SELECT id, name, code FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1 OR status = '1' OR status IS NULL) ORDER BY name ASC`,
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
                   l.status, l.attendance_taken, l.attendance_submitted_at,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.lecture_id = l.id) AS marked_count
            FROM lectures l
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
            query += ` AND (JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON)) OR b.name = ?)`;
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
    async saveStaffAttendance(tenantId, { branchId, date, records = [], userId } = {}) {
        if (!date) throw new Error('date is required');
        if (!Array.isArray(records)) records = [];

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
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
    }
};

module.exports = attendanceModel;
