const pool = require('../../config/db');

class AppExamModel {
    /**
     * Get student context with active enrollment & batch
     */
    async getStudentContext(tenantId, userId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name AS student_name,
                s.primary_branch_id,
                se.id AS enrollment_id,
                se.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                se.academic_year_id,
                ay.name AS academic_year_name
            FROM students s
            INNER JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            INNER JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.deleted_at IS NULL
            WHERE s.user_id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get list of upcoming scheduled exams for the student's batch
     */
    async getUpcomingExams(tenantId, studentId, batchId) {
        const query = `
            SELECT 
                e.id AS exam_id,
                e.name AS exam_title,
                e.description AS syllabus_and_instructions,
                e.exam_type,
                e.max_marks,
                e.passing_marks,
                e.exam_date,
                e.start_time,
                e.end_time,
                e.status AS exam_status,
                e.files AS attachments,
                e.metadata,
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                ay.name AS academic_year_name,
                em.id AS marks_record_id,
                em.marks_obtained,
                em.is_absent
            FROM exams e
            INNER JOIN exam_batch_assignments eba ON eba.exam_id = e.id AND eba.batch_id = ?
            INNER JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.deleted_at IS NULL
            LEFT JOIN exam_marks em ON em.exam_id = e.id AND em.student_id = ? AND em.deleted_at IS NULL
            WHERE e.tenant_id = ? 
              AND e.deleted_at IS NULL 
              AND e.status NOT IN ('cancelled', 'draft')
            ORDER BY e.exam_date ASC, e.start_time ASC
        `;
        const [rows] = await pool.query(query, [batchId, studentId, tenantId]);
        return rows;
    }

    /**
     * Get list of completed exam results for a student
     */
    async getExamResults(tenantId, studentId, { subjectId = null, academicYearId = null, page = 1, limit = 20 }) {
        const offset = (Number(page) - 1) * Number(limit);
        let whereClause = `
            WHERE em.student_id = ? 
              AND em.tenant_id = ? 
              AND em.deleted_at IS NULL
              AND (em.is_result_visible = 1 OR em.is_result_visible IS NULL)
        `;
        const params = [studentId, tenantId];

        if (subjectId) {
            whereClause += ` AND e.subject_id = ?`;
            params.push(Number(subjectId));
        }

        if (academicYearId) {
            whereClause += ` AND e.academic_year_id = ?`;
            params.push(Number(academicYearId));
        }

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM exam_marks em
            INNER JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
            ${whereClause}
        `;
        const [countRows] = await pool.query(countQuery, params);
        const total = Number(countRows[0]?.total || 0);

        const query = `
            SELECT 
                em.id AS marks_id,
                em.exam_id,
                e.name AS exam_title,
                e.exam_type,
                e.exam_date,
                e.max_marks,
                e.passing_marks,
                em.marks_obtained,
                em.is_absent,
                em.grade,
                em.remarks AS teacher_remarks,
                em.status AS result_status,
                em.created_at AS evaluated_at,
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                ay.id AS academic_year_id,
                ay.name AS academic_year_name,
                u.name AS evaluated_by_name
            FROM exam_marks em
            INNER JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
            INNER JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.deleted_at IS NULL
            LEFT JOIN users u ON u.id = em.created_by AND u.deleted_at IS NULL
            ${whereClause}
            ORDER BY e.exam_date DESC, em.id DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(query, [...params, Number(limit), Number(offset)]);
        return {
            rows,
            total
        };
    }

    /**
     * Get detailed result breakdown for a specific exam
     */
    async getExamResultDetails(tenantId, studentId, examId) {
        const query = `
            SELECT 
                em.id AS marks_id,
                em.exam_id,
                e.name AS exam_title,
                e.description AS exam_description,
                e.exam_type,
                e.exam_date,
                e.start_time,
                e.end_time,
                e.max_marks,
                e.passing_marks,
                e.files AS exam_files,
                e.metadata,
                em.marks_obtained,
                em.is_absent,
                em.grade,
                em.remarks AS teacher_remarks,
                em.status AS result_status,
                em.created_at AS evaluated_at,
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                ay.id AS academic_year_id,
                ay.name AS academic_year_name,
                u.name AS evaluated_by_name,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation
            FROM exam_marks em
            INNER JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
            INNER JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.deleted_at IS NULL
            LEFT JOIN users u ON u.id = em.created_by AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = em.created_by AND sp.deleted_at IS NULL
            WHERE em.exam_id = ? 
              AND em.student_id = ? 
              AND em.tenant_id = ? 
              AND em.deleted_at IS NULL
              AND (em.is_result_visible = 1 OR em.is_result_visible IS NULL)
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [examId, studentId, tenantId]);
        return rows[0] || null;
    }
}

module.exports = new AppExamModel();
