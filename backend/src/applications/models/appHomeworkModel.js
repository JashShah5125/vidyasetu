const pool = require('../../config/db');

const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

class AppHomeworkModel {
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
                se.academic_year_id
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
     * Get list of homeworks assigned to the student's batch with submission status
     */
    async getHomeworkList(tenantId, studentId, batchId, { status = null, subjectId = null, page = 1, limit = 20 }) {
        const offset = (Number(page) - 1) * Number(limit);
        const params = [tenantId, studentId, batchId, `%"${batchId}"%`, `[${batchId}]`, `%,${batchId},%`];

        let whereClause = `
            WHERE h.tenant_id = ? 
              AND h.status = 1 
              AND h.deleted_at IS NULL
              AND (
                  (JSON_VALID(h.batch_ids) AND JSON_CONTAINS(h.batch_ids, CAST(? AS JSON)))
                  OR h.batch_ids LIKE ?
                  OR h.batch_ids LIKE ?
                  OR h.batch_ids LIKE ?
              )
        `;

        if (subjectId) {
            whereClause += ` AND h.subject_id = ?`;
            params.push(Number(subjectId));
        }

        let baseParams = [studentId, tenantId, batchId, `%"${batchId}"%`, `[${batchId}]`, `%,${batchId},%`];
        let subjectFilter = '';
        if (subjectId) {
            subjectFilter = ` AND h.subject_id = ?`;
            baseParams.push(Number(subjectId));
        }

        let statusFilter = '';
        const statusParams = [];
        if (status) {
            statusFilter = ` AND computed_status = ?`;
            statusParams.push(String(status).toLowerCase().trim());
        }

        const countQuery = `
            SELECT COUNT(*) AS total FROM (
                SELECT 
                    h.id,
                    CASE 
                        WHEN hs.id IS NOT NULL AND (hs.status = 'graded' OR hs.status = 'Graded' OR hs.marks_obtained IS NOT NULL) THEN 'graded'
                        WHEN hs.id IS NOT NULL THEN 'submitted'
                        WHEN NOW() > h.due_date THEN 'overdue'
                        ELSE 'pending'
                    END AS computed_status
                FROM homeworks h
                LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = ? AND hs.deleted_at IS NULL
                ${whereClause}
            ) sub
            WHERE 1=1 ${statusFilter}
        `;

        const [countRows] = await pool.query(countQuery, [...baseParams, ...statusParams]);
        const total = Number(countRows[0]?.total || 0);

        const dataQuery = `
            SELECT * FROM (
                SELECT 
                    h.id AS homework_id,
                    h.title,
                    h.description,
                    h.assignment_type,
                    h.subject_id,
                    s.name AS subject_name,
                    s.code AS subject_code,
                    s.type AS subject_type,
                    h.due_date,
                    h.max_marks,
                    h.files AS teacher_attachments,
                    h.created_at,
                    h.created_by,
                    u.name AS teacher_name,
                    sp.first_name AS teacher_first_name,
                    sp.last_name AS teacher_last_name,
                    hs.id AS submission_id,
                    hs.status AS submission_status,
                    hs.marks_obtained,
                    hs.teacher_feedback,
                    hs.submitted_at,
                    hs.files AS student_attachments,
                    CASE 
                        WHEN hs.id IS NOT NULL AND (hs.status = 'graded' OR hs.status = 'Graded' OR hs.marks_obtained IS NOT NULL) THEN 'graded'
                        WHEN hs.id IS NOT NULL THEN 'submitted'
                        WHEN NOW() > h.due_date THEN 'overdue'
                        ELSE 'pending'
                    END AS computed_status
                FROM homeworks h
                INNER JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
                LEFT JOIN users u ON u.id = h.created_by AND u.deleted_at IS NULL
                LEFT JOIN staff_profiles sp ON sp.user_id = h.created_by AND sp.deleted_at IS NULL
                LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = ? AND hs.deleted_at IS NULL
                ${whereClause}
            ) sub
            WHERE 1=1 ${statusFilter}
            ORDER BY 
                CASE 
                    WHEN submission_id IS NULL AND NOW() <= due_date THEN 1
                    WHEN submission_id IS NULL AND NOW() > due_date THEN 2
                    ELSE 3
                END ASC,
                due_date ASC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(dataQuery, [...baseParams, ...statusParams, Number(limit), Number(offset)]);
        return {
            rows,
            total
        };
    }

    /**
     * Get details of a single homework item
     */
    async getHomeworkById(tenantId, homeworkId, studentId, batchId) {
        const query = `
            SELECT 
                h.id AS homework_id,
                h.branch_id,
                h.academic_year_id,
                h.title,
                h.description,
                h.assignment_type,
                h.batch_ids,
                h.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                h.due_date,
                h.max_marks,
                h.files AS teacher_attachments,
                h.status AS homework_status,
                h.published_at,
                h.created_at,
                h.created_by,
                u.name AS teacher_name,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation,
                hs.id AS submission_id,
                hs.response_text,
                hs.files AS student_attachments,
                hs.status AS submission_status,
                hs.marks_obtained,
                hs.teacher_feedback,
                hs.submitted_at,
                hs.graded_at,
                gu.name AS grader_name,
                CASE 
                    WHEN hs.id IS NOT NULL AND (hs.status = 'graded' OR hs.status = 'Graded' OR hs.marks_obtained IS NOT NULL) THEN 'graded'
                    WHEN hs.id IS NOT NULL THEN 'submitted'
                    WHEN NOW() > h.due_date THEN 'overdue'
                    ELSE 'pending'
                END AS computed_status
            FROM homeworks h
            INNER JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users u ON u.id = h.created_by AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = h.created_by AND sp.deleted_at IS NULL
            LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = ? AND hs.deleted_at IS NULL
            LEFT JOIN users gu ON gu.id = hs.graded_by AND gu.deleted_at IS NULL
            WHERE h.id = ? 
              AND h.tenant_id = ? 
              AND h.deleted_at IS NULL
            LIMIT 1
        `;

        const [rows] = await pool.query(query, [studentId, homeworkId, tenantId]);
        if (!rows.length) return null;

        const row = rows[0];
        const assignedBatches = parseJsonArray(row.batch_ids).map(Number);
        
        // Ensure student's batch is assigned to this homework
        if (assignedBatches.length > 0 && !assignedBatches.includes(Number(batchId))) {
            const err = new Error('Access denied. This homework is not assigned to your batch.');
            err.statusCode = 403;
            throw err;
        }

        return row;
    }

    /**
     * Get student's submission for a homework
     */
    async getSubmission(tenantId, homeworkId, studentId) {
        const query = `
            SELECT 
                hs.id AS submission_id,
                hs.homework_id,
                hs.student_id,
                hs.response_text,
                hs.files AS attachments,
                hs.status,
                hs.marks_obtained,
                hs.teacher_feedback,
                hs.submitted_at,
                hs.graded_by,
                hs.graded_at,
                gu.name AS grader_name,
                h.title AS homework_title,
                h.max_marks,
                h.due_date
            FROM homework_submissions hs
            INNER JOIN homeworks h ON h.id = hs.homework_id AND h.deleted_at IS NULL
            LEFT JOIN users gu ON gu.id = hs.graded_by AND gu.deleted_at IS NULL
            WHERE hs.homework_id = ? AND hs.student_id = ? AND hs.tenant_id = ? AND hs.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [homeworkId, studentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Create or update student submission
     */
    async saveSubmission(tenantId, homeworkId, studentId, { responseText = '', files = [] }) {
        const filesJson = JSON.stringify(files || []);
        
        // Check if submission already exists
        const [existing] = await pool.query(
            `SELECT id, status FROM homework_submissions WHERE homework_id = ? AND student_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
            [homeworkId, studentId, tenantId]
        );

        if (existing.length > 0) {
            const subId = existing[0].id;
            await pool.query(
                `UPDATE homework_submissions 
                 SET response_text = ?, files = ?, status = 'submitted', submitted_at = NOW(), updated_at = NOW() 
                 WHERE id = ? AND tenant_id = ?`,
                [responseText, filesJson, subId, tenantId]
            );
            return subId;
        } else {
            const [result] = await pool.query(
                `INSERT INTO homework_submissions 
                 (tenant_id, homework_id, student_id, response_text, files, status, submitted_at, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, 'submitted', NOW(), NOW(), NOW())`,
                [tenantId, homeworkId, studentId, responseText, filesJson]
            );
            return result.insertId;
        }
    }
}

module.exports = new AppHomeworkModel();
