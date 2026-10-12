const pool = require('../../config/db');

class AppAttendanceModel {
    /**
     * Get student & batch context for attendance
     */
    async getStudentContext(tenantId, userId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name AS student_name,
                se.id AS enrollment_id,
                se.batch_id,
                b.name AS batch_name,
                b.code AS batch_code
            FROM students s
            INNER JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            INNER JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            WHERE s.user_id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Overall attendance counts for a student
     */
    async getAttendanceSummary(tenantId, studentId) {
        const query = `
            SELECT 
                COUNT(ar.id) AS total_lectures,
                SUM(CASE WHEN ar.status = 1 THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN ar.status = 0 THEN 1 ELSE 0 END) AS absent_count,
                SUM(CASE WHEN ar.status = 2 THEN 1 ELSE 0 END) AS late_count
            FROM attendance_records ar
            WHERE ar.student_id = ? AND ar.tenant_id = ?
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows[0] || { total_lectures: 0, present_count: 0, absent_count: 0, late_count: 0 };
    }

    /**
     * Get attendance records for a student with day, date-range, month/year, or subject filters
     */
    async getAttendanceHistory(tenantId, studentId, { date = null, from = null, to = null, month = null, year = null, subjectId = null }) {
        let query = `
            SELECT 
                ar.id AS record_id,
                ar.lecture_id,
                ar.status AS attendance_status,
                ar.remarks,
                ar.created_at AS marked_at,
                l.lecture_date,
                l.start_time,
                l.end_time,
                l.slot_label,
                l.topic,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                l.teacher_user_id,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation,
                u.name AS teacher_user_name
            FROM attendance_records ar
            INNER JOIN lectures l ON l.id = ar.lecture_id AND l.deleted_at IS NULL
            INNER JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users u ON u.id = l.teacher_user_id AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.deleted_at IS NULL
            WHERE ar.student_id = ? AND ar.tenant_id = ?
        `;
        const params = [studentId, tenantId];

        // Specific single day filter (?date=YYYY-MM-DD)
        if (date) {
            query += ` AND l.lecture_date = ?`;
            params.push(date);
        } else if (from && to) {
            query += ` AND l.lecture_date BETWEEN ? AND ?`;
            params.push(from, to);
        } else if (month && year) {
            query += ` AND MONTH(l.lecture_date) = ? AND YEAR(l.lecture_date) = ?`;
            params.push(Number(month), Number(year));
        } else if (year) {
            query += ` AND YEAR(l.lecture_date) = ?`;
            params.push(Number(year));
        }

        // Optional subject filter (?subjectId=...)
        if (subjectId) {
            query += ` AND l.subject_id = ?`;
            params.push(Number(subjectId));
        }

        query += ` ORDER BY l.lecture_date DESC, l.start_time ASC`;

        const [rows] = await pool.query(query, params);
        return rows;
    }

    /**
     * Subject-wise attendance breakdown
     */
    async getSubjectWiseAttendance(tenantId, studentId, batchId) {
        const query = `
            SELECT 
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                COUNT(ar.id) AS total_lectures,
                SUM(CASE WHEN ar.status = 1 THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN ar.status = 0 THEN 1 ELSE 0 END) AS absent_count,
                SUM(CASE WHEN ar.status = 2 THEN 1 ELSE 0 END) AS late_count
            FROM level_subjects ls
            INNER JOIN batches b ON b.level_id = ls.level_id AND b.id = ?
            INNER JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
            LEFT JOIN lectures l ON l.subject_id = s.id AND l.batch_id = b.id AND l.deleted_at IS NULL
            LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.student_id = ? AND ar.tenant_id = ?
            WHERE ls.tenant_id = ?
            GROUP BY s.id, s.name, s.code, s.type
            ORDER BY s.name ASC
        `;
        const [rows] = await pool.query(query, [batchId, studentId, tenantId, tenantId]);
        return rows;
    }
}

module.exports = new AppAttendanceModel();
