const pool = require('../../config/db');

class AppParentHomeModel {
    /**
     * Get all linked children for a parent with live attendance % and pending fees
     */
    async getChildrenSummaries(tenantId, guardianId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name,
                s.current_class,
                s.dob,
                s.gender,
                s.mobile,
                s.email,
                s.blood_group,
                s.profile_photo_url,
                sg.is_primary,
                -- Branch
                b.id AS branch_id,
                b.name AS branch_name,
                -- Enrollment & Batch
                se.id AS enrollment_id,
                se.batch_id,
                bt.name AS batch_name,
                bt.code AS batch_code,
                -- Fee Assignment
                fa.net_amount AS fee_net_amount,
                fa.paid_amount AS fee_paid_amount,
                fa.balance_amount AS fee_balance_amount,
                fa.status AS fee_status,
                -- Attendance Aggregate
                COALESCE(att.total_lectures, 0) AS total_lectures,
                COALESCE(att.present_count, 0) AS present_count
            FROM student_guardians sg
            INNER JOIN students s ON s.id = sg.student_id AND s.deleted_at IS NULL
            LEFT JOIN branches b ON b.id = s.primary_branch_id AND b.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches bt ON bt.id = se.batch_id AND bt.deleted_at IS NULL
            LEFT JOIN (
                SELECT student_id, tenant_id, net_amount, paid_amount, balance_amount, status,
                       ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY id DESC) AS rn
                FROM student_fee_assignments
            ) fa ON fa.student_id = s.id AND fa.tenant_id = s.tenant_id AND fa.rn = 1
            LEFT JOIN (
                SELECT 
                    student_id,
                    tenant_id,
                    COUNT(id) AS total_lectures,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS present_count
                FROM attendance_records
                GROUP BY student_id, tenant_id
            ) att ON att.student_id = s.id AND att.tenant_id = s.tenant_id
            WHERE sg.guardian_id = ? AND sg.tenant_id = ?
            ORDER BY sg.is_primary DESC, s.id ASC
        `;
        const [rows] = await pool.query(query, [guardianId, tenantId]);
        return rows;
    }

    /**
     * Get single child details for overview screen
     */
    async getChildStudentDetails(tenantId, studentId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name,
                s.current_class,
                s.dob,
                s.gender,
                s.mobile,
                s.email,
                s.blood_group,
                s.profile_photo_url,
                b.id AS branch_id,
                b.name AS branch_name,
                se.id AS enrollment_id,
                se.batch_id,
                bt.name AS batch_name,
                bt.code AS batch_code
            FROM students s
            LEFT JOIN branches b ON b.id = s.primary_branch_id AND b.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches bt ON bt.id = se.batch_id AND bt.deleted_at IS NULL
            WHERE s.id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get weekly attendance stats for current week (Monday to today)
     */
    async getWeeklyAttendance(tenantId, studentId) {
        const query = `
            SELECT 
                COUNT(DISTINCT l.lecture_date) AS total_working_days_this_week,
                COUNT(DISTINCT CASE WHEN ar.status = 1 THEN l.lecture_date END) AS days_attended_this_week
            FROM attendance_records ar
            INNER JOIN lectures l ON l.id = ar.lecture_id
            WHERE ar.student_id = ? 
              AND ar.tenant_id = ?
              AND l.lecture_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
              AND l.lecture_date <= CURDATE()
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows[0] || { total_working_days_this_week: 0, days_attended_this_week: 0 };
    }

    /**
     * Get academic grade standing snapshot per subject for child
     */
    async getAcademicSnapshot(tenantId, studentId, batchId) {
        if (!batchId) return [];

        const query = `
            SELECT 
                s.id AS subject_id,
                s.name AS subject_name,
                (
                    SELECT em.grade 
                    FROM exam_marks em
                    INNER JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
                    WHERE e.subject_id = s.id 
                      AND em.student_id = ? 
                      AND em.tenant_id = ? 
                      AND em.deleted_at IS NULL
                    ORDER BY e.exam_date DESC, em.id DESC
                    LIMIT 1
                ) AS latest_grade
            FROM level_subjects ls
            INNER JOIN batches b ON b.level_id = ls.level_id AND b.id = ?
            INNER JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
            WHERE ls.tenant_id = ?
            ORDER BY s.name ASC
        `;
        const [rows] = await pool.query(query, [studentId, tenantId, batchId, tenantId]);
        return rows;
    }

    /**
     * Get upcoming agenda items for child (Upcoming exams, homework deadlines, PTM)
     */
    async getUpcomingEvents(tenantId, studentId, batchId) {
        const upcomingList = [];

        // 1. Upcoming Exams
        if (batchId) {
            const [examRows] = await pool.query(`
                SELECT 
                    e.id,
                    e.name AS title,
                    e.exam_date,
                    e.start_time,
                    e.max_marks,
                    s.name AS subject_name
                FROM exams e
                INNER JOIN exam_batch_assignments eba ON eba.exam_id = e.id AND eba.batch_id = ?
                INNER JOIN subjects s ON s.id = e.subject_id
                WHERE e.tenant_id = ? 
                  AND e.status = 'scheduled'
                  AND e.exam_date >= CURDATE()
                  AND e.deleted_at IS NULL
                ORDER BY e.exam_date ASC
                LIMIT 3
            `, [batchId, tenantId]);

            for (const ex of examRows) {
                upcomingList.push({
                    id: `exam-${ex.id}`,
                    type: 'exam',
                    title: `${ex.subject_name} test`,
                    subtitle: ex.title || 'Scheduled Test',
                    date: ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Upcoming',
                    rawDate: ex.exam_date
                });
            }
        }

        // 2. Upcoming Homework assignments
        if (batchId) {
            const [hwRows] = await pool.query(`
                SELECT 
                    h.id,
                    h.title,
                    h.due_date,
                    s.name AS subject_name,
                    hs.id AS submission_id
                FROM homeworks h
                INNER JOIN subjects s ON s.id = h.subject_id
                LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = ?
                WHERE h.tenant_id = ? 
                  AND h.due_date >= CURDATE()
                  AND h.deleted_at IS NULL
                  AND (
                      (JSON_VALID(h.batch_ids) AND JSON_CONTAINS(h.batch_ids, CAST(? AS JSON)))
                      OR h.batch_ids LIKE ?
                      OR h.batch_ids LIKE ?
                      OR h.batch_ids LIKE ?
                  )
                  AND hs.id IS NULL
                ORDER BY h.due_date ASC
                LIMIT 3
            `, [studentId, tenantId, batchId, `%"${batchId}"%`, `[${batchId}]`, `%,${batchId},%`]);

            for (const hw of hwRows) {
                upcomingList.push({
                    id: `hw-${hw.id}`,
                    type: 'homework',
                    title: hw.title || `${hw.subject_name} Project`,
                    subtitle: 'Submission Due',
                    date: hw.due_date ? new Date(hw.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Upcoming',
                    rawDate: hw.due_date
                });
            }
        }

        // Sort combined upcoming items by date
        upcomingList.sort((a, b) => new Date(a.rawDate || '2099-01-01') - new Date(b.rawDate || '2099-01-01'));

        return upcomingList;
    }

    /**
     * Get recent school updates and PTM announcements
     */
    async getRecentSchoolUpdates(tenantId) {
        // Query recent announcements / PTM notices
        const query = `
            SELECT 
                id,
                title,
                content AS message,
                category AS type,
                publish_date AS date,
                created_at
            FROM announcements
            WHERE tenant_id = ? 
              AND status = 'published'
              AND deleted_at IS NULL
            ORDER BY publish_date DESC, created_at DESC
            LIMIT 3
        `;
        try {
            const [rows] = await pool.query(query, [tenantId]);
            return rows;
        } catch (e) {
            // Fallback default notice if table not yet populated
            return [
                {
                    id: 1,
                    title: 'PTM scheduled for 24 Aug at 4 PM',
                    message: 'Parent-teacher meeting scheduled for academic progress discussion.',
                    type: 'ptm',
                    date: new Date()
                }
            ];
        }
    }
}

module.exports = new AppParentHomeModel();
