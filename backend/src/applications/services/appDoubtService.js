const appDoubtModel = require('../models/appDoubtModel');

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

const STATUS_LABELS = {
    0: 'open',
    1: 'in_progress',
    2: 'resolved',
    3: 'reopened'
};

const formatDisplayDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

class AppDoubtService {
    /**
     * List doubts for the logged-in student
     */
    async listDoubts(tenantId, userId, query = {}) {
        const studentContext = await appDoubtModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const { rows, total } = await appDoubtModel.listDoubts(tenantId, studentContext.student_id, {
            ...query,
            page,
            limit
        });

        const doubts = rows.map(r => {
            const statusCode = Number(r.status_code);
            return {
                id: r.doubt_id,
                topic: r.topic,
                status: STATUS_LABELS[statusCode] || 'open',
                statusCode,
                subject: {
                    id: r.subject_id,
                    name: r.subject_name,
                    code: r.subject_code,
                    type: r.subject_type || 'Core'
                },
                teacher: {
                    id: r.teacher_id,
                    name: r.teacher_name || 'Assigned Faculty',
                    designation: r.teacher_designation || 'Faculty'
                },
                stats: {
                    replyCount: Number(r.reply_count || 0),
                    unreadTeacherReplies: Number(r.unread_teacher_replies_count || 0)
                },
                lastActivity: {
                    message: r.last_message || null,
                    senderRole: r.last_reply_role || null,
                    timestamp: r.last_reply_at || r.updated_at,
                    formattedDate: formatDisplayDate(r.last_reply_at || r.updated_at)
                },
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            studentId: studentContext.student_id,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            doubts
        };
    }

    /**
     * Create a new doubt with initial question
     */
    async createDoubt(tenantId, userId, body, uploadedFiles = []) {
        const studentContext = await appDoubtModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const subjectId = Number(body.subjectId);
        let assignedTeacherId = body.assignedTeacherId ? Number(body.assignedTeacherId) : null;

        // Auto-resolve teacher if not explicitly chosen
        if (!assignedTeacherId) {
            assignedTeacherId = await appDoubtModel.resolveTeacherForSubject(
                tenantId, 
                studentContext.batch_id, 
                subjectId
            );
        }

        const attachments = uploadedFiles.map(file => ({
            fileName: file.filename,
            originalName: file.originalname,
            fileUrl: `/uploads/doubts/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype
        }));

        const doubtId = await appDoubtModel.createDoubt(tenantId, {
            branchId: studentContext.primary_branch_id,
            batchId: studentContext.batch_id,
            studentId: studentContext.student_id,
            subjectId,
            assignedTeacherId,
            topic: String(body.topic).trim(),
            message: body.message ? String(body.message).trim() : '',
            attachments,
            userId
        });

        return {
            doubtId,
            topic: body.topic,
            status: 'open',
            createdAt: new Date().toISOString(),
            attachmentsCount: attachments.length,
            message: 'Doubt created successfully! Teacher will be notified.'
        };
    }

    /**
     * Get complete thread and messages for a doubt
     */
    async getDoubtThread(tenantId, userId, doubtId) {
        const studentContext = await appDoubtModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const data = await appDoubtModel.getDoubtThread(tenantId, doubtId, studentContext.student_id);
        if (!data) {
            const err = new Error('Doubt thread not found or access denied.');
            err.statusCode = 404;
            throw err;
        }

        const doubt = data.doubt;
        const statusCode = Number(doubt.status_code);

        const messages = data.replies.map(m => {
            const rawAttachments = parseJsonArray(m.attachments);
            const attachments = rawAttachments.map(f => {
                if (typeof f === 'string') {
                    return { name: f.split('/').pop() || 'attachment', url: f };
                }
                return {
                    name: f.originalName || f.fileName || 'attachment',
                    url: f.fileUrl || `/uploads/doubts/${f.fileName}`,
                    size: f.fileSize || null
                };
            });

            return {
                id: m.message_id,
                sender: {
                    userId: m.sender_user_id,
                    name: m.sender_name || (m.sender_role === 'student' ? 'You' : 'Teacher'),
                    role: m.sender_role,
                    avatarUrl: m.sender_avatar ? `/uploads/avatars/${m.sender_avatar}` : null
                },
                message: m.message,
                attachments,
                isRead: Boolean(m.is_read),
                sentAt: m.created_at,
                sentAtFormatted: formatDisplayDate(m.created_at)
            };
        });

        return {
            id: doubt.doubt_id,
            topic: doubt.topic,
            status: STATUS_LABELS[statusCode] || 'open',
            statusCode,
            batch: {
                id: doubt.batch_id,
                name: doubt.batch_name
            },
            subject: {
                id: doubt.subject_id,
                name: doubt.subject_name,
                code: doubt.subject_code,
                type: doubt.subject_type || 'Core'
            },
            teacher: {
                id: doubt.teacher_id,
                name: doubt.teacher_name || 'Assigned Faculty',
                designation: doubt.teacher_designation || 'Faculty'
            },
            createdAt: doubt.created_at,
            updatedAt: doubt.updated_at,
            totalMessages: messages.length,
            messages
        };
    }

    /**
     * Add reply to a doubt thread
     */
    async replyDoubt(tenantId, userId, doubtId, body, uploadedFiles = []) {
        const studentContext = await appDoubtModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const attachments = uploadedFiles.map(file => ({
            fileName: file.filename,
            originalName: file.originalname,
            fileUrl: `/uploads/doubts/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype
        }));

        const message = body.message ? String(body.message).trim() : '';

        const messageId = await appDoubtModel.addReply(
            tenantId, 
            doubtId, 
            studentContext.student_id, 
            userId, 
            { message, attachments }
        );

        return {
            messageId,
            doubtId: Number(doubtId),
            sentAt: new Date().toISOString(),
            attachmentsCount: attachments.length,
            message: 'Reply posted successfully.'
        };
    }
}

module.exports = new AppDoubtService();
