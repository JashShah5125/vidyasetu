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

const STATUS_MAP = {
    0: 'open',
    1: 'in_progress',
    2: 'resolved',
    3: 'reopened'
};

const STATUS_REVERSE_MAP = {
    'open': 0,
    'in_progress': 1,
    'resolved': 2,
    'reopened': 3
};

class AppDoubtModel {
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
     * Auto-resolve teacher for student's batch and subject
     */
    async resolveTeacherForSubject(tenantId, batchId, subjectId) {
        // Try teacher allocations first
        const [allocRows] = await pool.query(
            `SELECT ta.teacher_user_id 
             FROM teacher_allocations ta
             INNER JOIN teacher_subjects ts ON ts.teacher_user_id = ta.teacher_user_id AND ts.subject_id = ?
             WHERE ta.tenant_id = ? AND ta.batch_id = ? AND ta.deleted_at IS NULL
             LIMIT 1`,
            [Number(subjectId), Number(tenantId), Number(batchId)]
        );
        if (allocRows.length) return allocRows[0].teacher_user_id;

        // Try lecture history fallback
        const [lectureRows] = await pool.query(
            `SELECT teacher_user_id 
             FROM lectures 
             WHERE tenant_id = ? AND batch_id = ? AND subject_id = ? AND deleted_at IS NULL 
             ORDER BY lecture_date DESC LIMIT 1`,
            [Number(tenantId), Number(batchId), Number(subjectId)]
        );
        if (lectureRows.length) return lectureRows[0].teacher_user_id;

        // Try general batch teacher allocation
        const [batchAllocRows] = await pool.query(
            `SELECT teacher_user_id FROM teacher_allocations WHERE tenant_id = ? AND batch_id = ? AND deleted_at IS NULL LIMIT 1`,
            [Number(tenantId), Number(batchId)]
        );
        if (batchAllocRows.length) return batchAllocRows[0].teacher_user_id;

        return null;
    }

    /**
     * List doubts for a student with filters and pagination
     */
    async listDoubts(tenantId, studentId, { status = null, subjectId = null, page = 1, limit = 20 }) {
        const offset = (Number(page) - 1) * Number(limit);
        const whereClauses = [
            'd.tenant_id = ?',
            'd.student_id = ?',
            'd.deleted_at IS NULL'
        ];
        const params = [Number(tenantId), Number(studentId)];

        if (status !== null && status !== undefined && status !== '') {
            const statusCode = STATUS_REVERSE_MAP[String(status).toLowerCase().trim()];
            if (statusCode !== undefined) {
                whereClauses.push('d.status = ?');
                params.push(statusCode);
            }
        }

        if (subjectId) {
            whereClauses.push('d.subject_id = ?');
            params.push(Number(subjectId));
        }

        const query = `
            SELECT 
                d.id AS doubt_id,
                d.topic,
                d.status AS status_code,
                d.created_at,
                d.updated_at,
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                tchr.id AS teacher_id,
                COALESCE(CONCAT(sp.first_name, ' ', sp.last_name), tchr.name) AS teacher_name,
                sp.designation AS teacher_designation,
                (SELECT COUNT(*) FROM student_doubt_replies r WHERE r.doubt_id = d.id) AS reply_count,
                (SELECT COUNT(*) FROM student_doubt_replies r WHERE r.doubt_id = d.id AND r.sender_role = 'teacher' AND r.is_read = 0) AS unread_teacher_replies_count,
                (SELECT r.message FROM student_doubt_replies r WHERE r.doubt_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS last_message,
                (SELECT r.created_at FROM student_doubt_replies r WHERE r.doubt_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS last_reply_at,
                (SELECT r.sender_role FROM student_doubt_replies r WHERE r.doubt_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS last_reply_role
            FROM student_doubts d
            INNER JOIN subjects s ON s.id = d.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users tchr ON tchr.id = d.assigned_teacher_id AND tchr.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = d.assigned_teacher_id AND sp.deleted_at IS NULL
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY d.updated_at DESC, d.id DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM student_doubts d
            WHERE ${whereClauses.join(' AND ')}
        `;
        const [countRows] = await pool.query(countQuery, params);

        const [rows] = await pool.query(query, [...params, Number(limit), Number(offset)]);
        return {
            rows,
            total: Number(countRows[0]?.total || 0)
        };
    }

    /**
     * Get full doubt thread with all messages
     */
    async getDoubtThread(tenantId, doubtId, studentId) {
        const doubtQuery = `
            SELECT 
                d.id AS doubt_id,
                d.topic,
                d.status AS status_code,
                d.created_at,
                d.updated_at,
                d.batch_id,
                b.name AS batch_name,
                s.id AS subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                tchr.id AS teacher_id,
                COALESCE(CONCAT(sp.first_name, ' ', sp.last_name), tchr.name) AS teacher_name,
                sp.designation AS teacher_designation
            FROM student_doubts d
            INNER JOIN batches b ON b.id = d.batch_id AND b.deleted_at IS NULL
            INNER JOIN subjects s ON s.id = d.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users tchr ON tchr.id = d.assigned_teacher_id AND tchr.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = d.assigned_teacher_id AND sp.deleted_at IS NULL
            WHERE d.id = ? AND d.student_id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL
            LIMIT 1
        `;
        const [doubtRows] = await pool.query(doubtQuery, [doubtId, studentId, tenantId]);
        if (!doubtRows.length) return null;

        const doubt = doubtRows[0];

        // Fetch all messages/replies in thread
        const repliesQuery = `
            SELECT 
                r.id AS message_id,
                r.doubt_id,
                r.sender_user_id,
                r.sender_role,
                r.message,
                r.attachments,
                r.is_read,
                r.created_at,
                u.name AS sender_name
            FROM student_doubt_replies r
            LEFT JOIN users u ON u.id = r.sender_user_id AND u.deleted_at IS NULL
            WHERE r.doubt_id = ?
            ORDER BY r.created_at ASC, r.id ASC
        `;
        const [replies] = await pool.query(repliesQuery, [doubtId]);

        // Mark unread teacher replies as read
        await pool.query(
            `UPDATE student_doubt_replies SET is_read = 1 WHERE doubt_id = ? AND sender_role = 'teacher' AND is_read = 0`,
            [doubtId]
        );

        return {
            doubt,
            replies
        };
    }

    /**
     * Create doubt thread with initial question in a transaction
     */
    async createDoubt(tenantId, { branchId, batchId, studentId, subjectId, assignedTeacherId, topic, message, attachments, userId }) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Insert Doubt header
            const [result] = await conn.query(
                `INSERT INTO student_doubts 
                 (tenant_id, branch_id, batch_id, student_id, subject_id, assigned_teacher_id, topic, status, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [tenantId, branchId, batchId, studentId, subjectId, assignedTeacherId, topic]
            );

            const doubtId = result.insertId;

            // 2. Insert Initial Reply
            await conn.query(
                `INSERT INTO student_doubt_replies 
                 (doubt_id, sender_user_id, sender_role, message, attachments, is_read, created_at) 
                 VALUES (?, ?, 'student', ?, ?, 0, NOW())`,
                [doubtId, userId, message, JSON.stringify(attachments || [])]
            );

            await conn.commit();
            return doubtId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Add reply message to an existing doubt
     */
    async addReply(tenantId, doubtId, studentId, userId, { message, attachments = [] }) {
        // Ensure doubt exists and belongs to student
        const [doubtRows] = await pool.query(
            `SELECT id, status FROM student_doubts WHERE id = ? AND student_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [doubtId, studentId, tenantId]
        );
        if (!doubtRows.length) {
            const err = new Error('Doubt thread not found or access denied.');
            err.statusCode = 404;
            throw err;
        }

        const currentStatus = doubtRows[0].status;
        const newStatus = currentStatus === 2 ? 3 : currentStatus; // If resolved, set to reopened (3), else keep current

        // Insert reply
        const [result] = await pool.query(
            `INSERT INTO student_doubt_replies 
             (doubt_id, sender_user_id, sender_role, message, attachments, is_read, created_at) 
             VALUES (?, ?, 'student', ?, ?, 0, NOW())`,
            [doubtId, userId, message, JSON.stringify(attachments || [])]
        );

        // Update doubt header status & timestamp
        await pool.query(
            `UPDATE student_doubts SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
            [newStatus, doubtId, tenantId]
        );

        return result.insertId;
    }
}

module.exports = new AppDoubtModel();
