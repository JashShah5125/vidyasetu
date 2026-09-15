const pool = require('../config/db');
const studentDoubtModel = require('../models/studentDoubtModel');

class DoubtService {
    /**
     * Resolve student identity and active enrollments from req.user.userId
     */
    async resolveStudentContext(tenantId, userId) {
        const tid = Number(tenantId);
        const uid = Number(userId);

        const [rows] = await pool.query(
            `SELECT s.id, s.student_code, s.full_name, s.primary_branch_id
             FROM students s
             WHERE s.tenant_id = ? AND s.user_id = ? AND s.deleted_at IS NULL
             LIMIT 1`,
            [tid, uid]
        );

        if (!rows.length) {
            const err = new Error('No active student profile linked to this user account.');
            err.statusCode = 404;
            throw err;
        }

        return {
            studentId: Number(rows[0].id),
            studentCode: rows[0].student_code,
            fullName: rows[0].full_name,
            primaryBranchId: rows[0].primary_branch_id
        };
    }

    /**
     * Get eligible teachers for student's dropdown
     */
    async getEligibleTeachersForStudent(tenantId, userId) {
        const student = await this.resolveStudentContext(tenantId, userId);
        return studentDoubtModel.getEligibleTeachers(tenantId, student.studentId);
    }

    /**
     * Create a doubt as a student
     */
    async createStudentDoubt(tenantId, userId, payload, files = []) {
        const student = await this.resolveStudentContext(tenantId, userId);

        const batchId = Number(payload.batchId);
        const subjectId = Number(payload.subjectId);
        const assignedTeacherId = Number(payload.assignedTeacherId);
        const topic = String(payload.topic || '').trim();
        const message = String(payload.message || '').trim();

        if (!batchId || !subjectId || !assignedTeacherId) {
            const err = new Error('Batch, subject, and assigned teacher are required.');
            err.statusCode = 400;
            throw err;
        }

        if (!topic) {
            const err = new Error('Topic is required.');
            err.statusCode = 400;
            throw err;
        }

        if (!message && (!files || files.length === 0)) {
            const err = new Error('Message or at least one attachment is required to ask a doubt.');
            err.statusCode = 400;
            throw err;
        }

        // Validate teacher allocation for this batch & subject
        const eligible = await studentDoubtModel.getEligibleTeachers(tenantId, student.studentId);
        const teacherMatch = eligible.teachers.find(t => t.teacherId === assignedTeacherId);
        if (!teacherMatch) {
            const err = new Error('Selected teacher is not allocated to any of your active batches.');
            err.statusCode = 400;
            throw err;
        }

        const assignmentMatch = teacherMatch.assignments.find(
            a => a.batchId === batchId && a.subjectId === subjectId
        );
        if (!assignmentMatch) {
            const err = new Error('Selected teacher does not teach this subject in the specified batch.');
            err.statusCode = 400;
            throw err;
        }

        // Process attachments
        const attachments = (files || []).map(f => `/uploads/doubts/${f.filename}`);

        return studentDoubtModel.createDoubt(tenantId, {
            studentId: student.studentId,
            batchId,
            subjectId,
            assignedTeacherId,
            topic,
            message,
            senderUserId: userId,
            attachments
        });
    }

    /**
     * List doubts for a student
     */
    async listStudentDoubts(tenantId, userId, filters = {}) {
        const student = await this.resolveStudentContext(tenantId, userId);
        return studentDoubtModel.listDoubts(tenantId, {
            role: 'student',
            studentId: student.studentId
        }, filters);
    }

    /**
     * Get doubt thread details for student
     */
    async getStudentDoubtById(tenantId, userId, doubtId) {
        const student = await this.resolveStudentContext(tenantId, userId);
        const doubt = await studentDoubtModel.getDoubtById(tenantId, doubtId);

        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.student.id !== student.studentId) {
            const err = new Error('Unauthorized: You do not have access to this doubt thread.');
            err.statusCode = 403;
            throw err;
        }

        // Mark teacher messages as read
        await studentDoubtModel.markRepliesRead(tenantId, doubtId, 'student');

        return doubt;
    }

    /**
     * Add student reply to a doubt thread
     */
    async addStudentReply(tenantId, userId, doubtId, payload, files = []) {
        const student = await this.resolveStudentContext(tenantId, userId);
        const doubt = await studentDoubtModel.getDoubtById(tenantId, doubtId);

        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.student.id !== student.studentId) {
            const err = new Error('Unauthorized: You do not have access to this doubt thread.');
            err.statusCode = 403;
            throw err;
        }

        const message = String(payload.message || '').trim();
        const attachments = (files || []).map(f => `/uploads/doubts/${f.filename}`);

        if (!message && attachments.length === 0) {
            const err = new Error('Message or attachment is required to reply.');
            err.statusCode = 400;
            throw err;
        }

        return studentDoubtModel.addReply(tenantId, doubtId, {
            senderUserId: userId,
            senderRole: 'student',
            message,
            attachments
        });
    }

    /**
     * Update doubt status as student (e.g. resolve or reopen)
     */
    async updateStudentDoubtStatus(tenantId, userId, doubtId, status) {
        const student = await this.resolveStudentContext(tenantId, userId);
        const doubt = await studentDoubtModel.getDoubtById(tenantId, doubtId);

        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.student.id !== student.studentId) {
            const err = new Error('Unauthorized: You do not have access to this doubt thread.');
            err.statusCode = 403;
            throw err;
        }

        const s = Number(status);
        if (![0, 1, 2, 3].includes(s)) {
            const err = new Error('Invalid status code.');
            err.statusCode = 400;
            throw err;
        }

        return studentDoubtModel.updateStatus(tenantId, doubtId, s);
    }

    // ==========================================
    // TEACHER ACTIONS
    // ==========================================

    /**
     * List doubts assigned to the teacher
     */
    async listTeacherDoubts(tenantId, teacherUserId, filters = {}) {
        return studentDoubtModel.listDoubts(tenantId, {
            role: 'teacher',
            teacherUserId: Number(teacherUserId)
        }, filters);
    }

    /**
     * Get single doubt thread for teacher
     */
    async getTeacherDoubtById(tenantId, teacherUserId, doubtId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const did = Number(doubtId);

        const doubt = await studentDoubtModel.getDoubtById(tid, did);
        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.teacher.id !== uid) {
            const err = new Error('Unauthorized: This doubt is not assigned to you.');
            err.statusCode = 403;
            throw err;
        }

        // Mark student messages as read
        await studentDoubtModel.markRepliesRead(tid, did, 'teacher');

        return doubt;
    }

    /**
     * Add teacher reply
     */
    async addTeacherReply(tenantId, teacherUserId, doubtId, payload, files = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const did = Number(doubtId);

        const doubt = await studentDoubtModel.getDoubtById(tid, did);
        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.teacher.id !== uid) {
            const err = new Error('Unauthorized: This doubt is not assigned to you.');
            err.statusCode = 403;
            throw err;
        }

        const message = String(payload.message || '').trim();
        const attachments = (files || []).map(f => `/uploads/doubts/${f.filename}`);

        if (!message && attachments.length === 0) {
            const err = new Error('Message or attachment is required to reply.');
            err.statusCode = 400;
            throw err;
        }

        return studentDoubtModel.addReply(tid, did, {
            senderUserId: uid,
            senderRole: 'teacher',
            message,
            attachments
        });
    }

    /**
     * Update doubt status as teacher (e.g. resolve 2 or reopen 3)
     */
    async updateTeacherDoubtStatus(tenantId, teacherUserId, doubtId, status) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const did = Number(doubtId);

        const doubt = await studentDoubtModel.getDoubtById(tid, did);
        if (!doubt) {
            const err = new Error('Doubt thread not found.');
            err.statusCode = 404;
            throw err;
        }

        if (doubt.teacher.id !== uid) {
            const err = new Error('Unauthorized: This doubt is not assigned to you.');
            err.statusCode = 403;
            throw err;
        }

        const s = Number(status);
        if (![0, 1, 2, 3].includes(s)) {
            const err = new Error('Invalid status code.');
            err.statusCode = 400;
            throw err;
        }

        return studentDoubtModel.updateStatus(tid, did, s);
    }
}

module.exports = new DoubtService();
