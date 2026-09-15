const pool = require('../config/db');

const parseAttachments = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

class StudentDoubtModel {
    /**
     * Resolve eligible teachers for a student within their active enrolled batches.
     * Returns teachers grouped with their batch and subject teaching assignments.
     */
    async getEligibleTeachers(tenantId, studentId) {
        const tid = Number(tenantId);
        const sid = Number(studentId);

        // 1. Get active batches for this student
        const [enrollments] = await pool.query(
            `SELECT se.batch_id, b.name AS batch_name
             FROM student_enrollments se
             JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
             WHERE se.tenant_id = ? AND se.student_id = ? AND se.status = 'active' AND se.deleted_at IS NULL`,
            [tid, sid]
        );

        if (!enrollments.length) {
            return { teachers: [] };
        }

        const studentBatchIds = enrollments.map(e => Number(e.batch_id));

        // 2. Fetch teachers allocated to these batches
        const [allocRows] = await pool.query(
            `SELECT DISTINCT 
                ta.teacher_user_id,
                u.name AS teacher_name,
                ta.batch_id,
                b.name AS batch_name
             FROM teacher_allocations ta
             JOIN users u ON u.id = ta.teacher_user_id AND u.deleted_at IS NULL AND (u.status = 1 OR u.status = 'active')
             JOIN batches b ON b.id = ta.batch_id AND b.deleted_at IS NULL
             WHERE ta.tenant_id = ? AND ta.batch_id IN (?) AND ta.deleted_at IS NULL`,
            [tid, studentBatchIds]
        );

        if (!allocRows.length) {
            return { teachers: [] };
        }

        const teacherUserIds = Array.from(new Set(allocRows.map(r => Number(r.teacher_user_id))));

        // 3. Fetch subjects taught by these teachers (from teacher_subjects + lectures fallback + batch level curriculum)
        const [teacherSubjectRows] = await pool.query(
            `SELECT DISTINCT ts.teacher_user_id, ts.subject_id, s.name AS subject_name, s.code AS subject_code
             FROM teacher_subjects ts
             JOIN subjects s ON s.id = ts.subject_id AND s.deleted_at IS NULL
             WHERE ts.tenant_id = ? AND ts.teacher_user_id IN (?)`,
            [tid, teacherUserIds]
        );

        const [lectureSubjectRows] = await pool.query(
            `SELECT DISTINCT l.teacher_user_id, l.subject_id, s.name AS subject_name, s.code AS subject_code
             FROM lectures l
             JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
             WHERE l.tenant_id = ? AND l.teacher_user_id IN (?) AND l.deleted_at IS NULL`,
            [tid, teacherUserIds]
        );

        // Map teacherId -> subjects
        const subjectsByTeacher = new Map();
        for (const r of [...teacherSubjectRows, ...lectureSubjectRows]) {
            const uid = Number(r.teacher_user_id);
            if (!subjectsByTeacher.has(uid)) {
                subjectsByTeacher.set(uid, new Map());
            }
            subjectsByTeacher.get(uid).set(Number(r.subject_id), {
                id: Number(r.subject_id),
                name: r.subject_name,
                code: r.subject_code || ''
            });
        }

        // Fallback for any teacher without explicit teacher_subjects/lectures: curriculum subjects of their allocated batches
        const teachersNeedingFallback = teacherUserIds.filter(uid => !subjectsByTeacher.has(uid) || subjectsByTeacher.get(uid).size === 0);
        if (teachersNeedingFallback.length > 0) {
            const [curriculumRows] = await pool.query(
                `SELECT DISTINCT ta.teacher_user_id, ls.subject_id, s.name AS subject_name, s.code AS subject_code
                 FROM teacher_allocations ta
                 JOIN batches b ON b.id = ta.batch_id AND b.deleted_at IS NULL
                 JOIN level_subjects ls ON ls.level_id = b.level_id AND ls.tenant_id = b.tenant_id
                 JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
                 WHERE ta.tenant_id = ? AND ta.teacher_user_id IN (?) AND ta.deleted_at IS NULL`,
                [tid, teachersNeedingFallback]
            );

            for (const r of curriculumRows) {
                const uid = Number(r.teacher_user_id);
                if (!subjectsByTeacher.has(uid)) {
                    subjectsByTeacher.set(uid, new Map());
                }
                subjectsByTeacher.get(uid).set(Number(r.subject_id), {
                    id: Number(r.subject_id),
                    name: r.subject_name,
                    code: r.subject_code || ''
                });
            }
        }

        // Group into clean response
        const teacherMap = new Map();
        for (const alloc of allocRows) {
            const uid = Number(alloc.teacher_user_id);
            if (!teacherMap.has(uid)) {
                teacherMap.set(uid, {
                    teacherId: uid,
                    teacherName: alloc.teacher_name,
                    assignments: []
                });
            }

            const teacherSubjs = Array.from((subjectsByTeacher.get(uid) || new Map()).values());
            for (const subj of teacherSubjs) {
                teacherMap.get(uid).assignments.push({
                    batchId: Number(alloc.batch_id),
                    batchName: alloc.batch_name,
                    subjectId: subj.id,
                    subjectName: subj.name,
                    subjectCode: subj.code
                });
            }
        }

        return {
            teachers: Array.from(teacherMap.values())
        };
    }

    /**
     * Create a doubt thread with initial question in a single transaction.
     */
    async createDoubt(tenantId, data) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const tid = Number(tenantId);
            const studentId = Number(data.studentId);
            const batchId = Number(data.batchId);
            const subjectId = Number(data.subjectId);
            const assignedTeacherId = Number(data.assignedTeacherId);
            const topic = String(data.topic || '').trim();
            const message = String(data.message || '').trim();
            const senderUserId = Number(data.senderUserId);
            const attachments = parseAttachments(data.attachments);

            // Optional branch_id lookup from batch
            const [batchRows] = await conn.query(
                `SELECT branch_id FROM batches WHERE id = ? AND tenant_id = ? LIMIT 1`,
                [batchId, tid]
            );
            const branchId = batchRows[0]?.branch_id || null;

            // 1. Insert Header
            const [headerResult] = await conn.query(
                `INSERT INTO student_doubts
                 (tenant_id, branch_id, batch_id, student_id, subject_id, assigned_teacher_id, topic, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [tid, branchId, batchId, studentId, subjectId, assignedTeacherId, topic]
            );

            const doubtId = headerResult.insertId;

            // 2. Insert First Reply (Initial Question)
            await conn.query(
                `INSERT INTO student_doubt_replies
                 (doubt_id, sender_user_id, sender_role, message, attachments, is_read, created_at)
                 VALUES (?, ?, 'student', ?, ?, 0, NOW())`,
                [doubtId, senderUserId, message, JSON.stringify(attachments)]
            );

            await conn.commit();
            return this.getDoubtById(tid, doubtId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * List doubts with filters (for teacher or student).
     */
    async listDoubts(tenantId, userContext, filters = {}) {
        const tid = Number(tenantId);
        const whereClauses = [
            'd.tenant_id = ?',
            'd.deleted_at IS NULL'
        ];
        const params = [tid];

        if (userContext.role === 'teacher') {
            whereClauses.push('d.assigned_teacher_id = ?');
            params.push(Number(userContext.teacherUserId));
        } else if (userContext.role === 'student') {
            whereClauses.push('d.student_id = ?');
            params.push(Number(userContext.studentId));
        }

        // Status filter: 0=Open, 1=In Progress, 2=Resolved, 3=Reopened
        if (filters.status !== undefined && filters.status !== 'All' && filters.status !== '') {
            whereClauses.push('d.status = ?');
            params.push(Number(filters.status));
        }

        // Batch filter
        if (filters.batchId && filters.batchId !== 'All' && filters.batchId !== '') {
            whereClauses.push('d.batch_id = ?');
            params.push(Number(filters.batchId));
        }

        // Subject filter
        if (filters.subjectId && filters.subjectId !== 'All' && filters.subjectId !== '') {
            whereClauses.push('d.subject_id = ?');
            params.push(Number(filters.subjectId));
        }

        // Search filter: topic, student name, teacher name, subject
        if (filters.search && filters.search.trim() !== '') {
            const term = `%${filters.search.trim()}%`;
            whereClauses.push('(d.topic LIKE ? OR stu.full_name LIKE ? OR tchr.name LIKE ? OR s.name LIKE ?)');
            params.push(term, term, term, term);
        }

        // Unread filter
        if (filters.unread === true || filters.unread === 'true') {
            const opponentRole = userContext.role === 'teacher' ? 'student' : 'teacher';
            whereClauses.push(`EXISTS (
                SELECT 1 FROM student_doubt_replies r 
                WHERE r.doubt_id = d.id AND r.sender_role = ? AND r.is_read = 0
            )`);
            params.push(opponentRole);
        }

        const whereSql = whereClauses.join(' AND ');

        const [rows] = await pool.query(
            `SELECT 
                d.id,
                d.topic,
                d.status,
                d.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                d.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                d.student_id,
                stu.student_code,
                stu.full_name AS student_name,
                d.assigned_teacher_id,
                tchr.name AS teacher_name,
                d.created_at,
                d.updated_at,
                (SELECT COUNT(*) FROM student_doubt_replies r WHERE r.doubt_id = d.id) AS reply_count,
                (SELECT COUNT(*) FROM student_doubt_replies r WHERE r.doubt_id = d.id AND r.sender_role = ? AND r.is_read = 0) AS unread_count,
                (SELECT r.message FROM student_doubt_replies r WHERE r.doubt_id = d.id ORDER BY r.id DESC LIMIT 1) AS last_message,
                (SELECT r.created_at FROM student_doubt_replies r WHERE r.doubt_id = d.id ORDER BY r.id DESC LIMIT 1) AS last_activity_at
             FROM student_doubts d
             JOIN batches b ON b.id = d.batch_id
             JOIN subjects s ON s.id = d.subject_id
             JOIN students stu ON stu.id = d.student_id
             JOIN users tchr ON tchr.id = d.assigned_teacher_id
             WHERE ${whereSql}
             ORDER BY d.updated_at DESC, d.id DESC`,
            [userContext.role === 'teacher' ? 'student' : 'teacher', ...params]
        );

        return rows.map(r => ({
            id: r.id,
            topic: r.topic,
            status: Number(r.status),
            statusCode: Number(r.status),
            statusLabel: this.formatStatus(r.status),
            batch: {
                id: r.batch_id,
                name: r.batch_name,
                code: r.batch_code || ''
            },
            subject: {
                id: r.subject_id,
                name: r.subject_name,
                code: r.subject_code || ''
            },
            student: {
                id: r.student_id,
                name: r.student_name,
                code: r.student_code || ''
            },
            teacher: {
                id: r.assigned_teacher_id,
                name: r.teacher_name
            },
            replyCount: Number(r.reply_count || 0),
            unreadCount: Number(r.unread_count || 0),
            lastMessage: r.last_message || '',
            lastActivityAt: r.last_activity_at || r.updated_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    }

    /**
     * Get single doubt thread with full details and replies.
     */
    async getDoubtById(tenantId, doubtId) {
        const tid = Number(tenantId);
        const did = Number(doubtId);

        const [rows] = await pool.query(
            `SELECT 
                d.id,
                d.topic,
                d.status,
                d.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                d.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                d.student_id,
                stu.student_code,
                stu.full_name AS student_name,
                d.assigned_teacher_id,
                tchr.name AS teacher_name,
                d.created_at,
                d.updated_at
             FROM student_doubts d
             JOIN batches b ON b.id = d.batch_id
             JOIN subjects s ON s.id = d.subject_id
             JOIN students stu ON stu.id = d.student_id
             JOIN users tchr ON tchr.id = d.assigned_teacher_id
             WHERE d.id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL`,
            [did, tid]
        );

        if (!rows.length) {
            return null;
        }

        const doubt = rows[0];

        // Fetch all replies
        const [replies] = await pool.query(
            `SELECT 
                r.id,
                r.doubt_id,
                r.sender_user_id,
                r.sender_role,
                u.name AS sender_name,
                r.message,
                r.attachments,
                r.is_read,
                r.created_at
             FROM student_doubt_replies r
             JOIN users u ON u.id = r.sender_user_id
             WHERE r.doubt_id = ?
             ORDER BY r.created_at ASC, r.id ASC`,
            [did]
        );

        return {
            id: doubt.id,
            topic: doubt.topic,
            status: Number(doubt.status),
            statusCode: Number(doubt.status),
            statusLabel: this.formatStatus(doubt.status),
            student: {
                id: doubt.student_id,
                name: doubt.student_name,
                code: doubt.student_code || ''
            },
            teacher: {
                id: doubt.assigned_teacher_id,
                name: doubt.teacher_name
            },
            batch: {
                id: doubt.batch_id,
                name: doubt.batch_name,
                code: doubt.batch_code || ''
            },
            subject: {
                id: doubt.subject_id,
                name: doubt.subject_name,
                code: doubt.subject_code || ''
            },
            createdAt: doubt.created_at,
            updatedAt: doubt.updated_at,
            replies: replies.map(r => ({
                id: r.id,
                senderUserId: r.sender_user_id,
                senderName: r.sender_name,
                senderRole: r.sender_role,
                message: r.message || '',
                attachments: parseAttachments(r.attachments),
                isRead: Boolean(r.is_read),
                createdAt: r.created_at
            }))
        };
    }

    /**
     * Add a reply to an existing doubt thread and perform automatic status transitions.
     */
    async addReply(tenantId, doubtId, data) {
        const tid = Number(tenantId);
        const did = Number(doubtId);
        const senderUserId = Number(data.senderUserId);
        const senderRole = String(data.senderRole).toLowerCase();
        const message = String(data.message || '').trim();
        const attachments = parseAttachments(data.attachments);

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Insert Reply
            await conn.query(
                `INSERT INTO student_doubt_replies
                 (doubt_id, sender_user_id, sender_role, message, attachments, is_read, created_at)
                 VALUES (?, ?, ?, ?, ?, 0, NOW())`,
                [did, senderUserId, senderRole, message, JSON.stringify(attachments)]
            );

            // 2. Automatic Status Transitions
            if (senderRole === 'teacher') {
                // Teacher reply on Open (0) or Reopened (3) -> In Progress (1)
                await conn.query(
                    `UPDATE student_doubts 
                     SET status = 1, updated_at = NOW() 
                     WHERE id = ? AND tenant_id = ? AND status IN (0, 3)`,
                    [did, tid]
                );
            } else if (senderRole === 'student') {
                // Student reply on Resolved (2) -> Reopened (3)
                await conn.query(
                    `UPDATE student_doubts 
                     SET status = 3, updated_at = NOW() 
                     WHERE id = ? AND tenant_id = ? AND status = 2`,
                    [did, tid]
                );
            }

            // Touch updated_at regardless
            await conn.query(
                `UPDATE student_doubts SET updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [did, tid]
            );

            await conn.commit();
            return this.getDoubtById(tid, did);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Mark unread messages in a thread as read by the viewing party.
     */
    async markRepliesRead(tenantId, doubtId, readerRole) {
        const did = Number(doubtId);
        const opponentRole = readerRole === 'teacher' ? 'student' : 'teacher';

        await pool.query(
            `UPDATE student_doubt_replies
             SET is_read = 1
             WHERE doubt_id = ? AND sender_role = ? AND is_read = 0`,
            [did, opponentRole]
        );
    }

    /**
     * Update status explicitly (e.g. Teacher marks Resolved (2) or Reopened (3)).
     */
    async updateStatus(tenantId, doubtId, status) {
        const tid = Number(tenantId);
        const did = Number(doubtId);
        const s = Number(status);

        await pool.query(
            `UPDATE student_doubts
             SET status = ?, updated_at = NOW()
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [s, did, tid]
        );

        return this.getDoubtById(tid, did);
    }

    formatStatus(status) {
        const s = Number(status);
        switch (s) {
            case 0: return 'Open';
            case 1: return 'In Progress';
            case 2: return 'Resolved';
            case 3: return 'Reopened';
            default: return 'Open';
        }
    }
}

module.exports = new StudentDoubtModel();
