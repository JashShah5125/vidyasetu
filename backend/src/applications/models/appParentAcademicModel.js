const pool = require('../../config/db');

class AppParentAcademicModel {
    /**
     * Get student context with active batch and enrollment by studentId
     */
    async getStudentBatchContext(tenantId, studentId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name AS student_name,
                s.primary_branch_id,
                se.id AS enrollment_id,
                se.batch_id,
                se.branch_id,
                se.academic_year_id,
                b.name AS batch_name,
                b.code AS batch_code,
                ay.name AS academic_year_name
            FROM students s
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.deleted_at IS NULL
            WHERE s.id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows[0] || null;
    }
}

module.exports = new AppParentAcademicModel();
