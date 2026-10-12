const appHomeworkModel = require('../models/appHomeworkModel');

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

const formatDueDateTime = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toISOString();
};

const formatDisplayDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

class AppHomeworkService {
    /**
     * List homeworks for student's enrolled batch
     */
    async list(tenantId, userId, query = {}) {
        const studentContext = await appHomeworkModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const { rows, total } = await appHomeworkModel.getHomeworkList(
            tenantId, 
            studentContext.student_id, 
            studentContext.batch_id, 
            {
                ...query,
                page,
                limit
            }
        );

        const homeworks = rows.map(r => {
            const teacherName = [r.teacher_first_name, r.teacher_last_name].filter(Boolean).join(' ') || r.teacher_name || 'Faculty';
            const teacherFiles = parseJsonArray(r.teacher_attachments);

            return {
                id: r.homework_id,
                title: r.title,
                description: r.description,
                assignmentType: r.assignment_type || 'homework',
                subject: {
                    id: r.subject_id,
                    name: r.subject_name,
                    code: r.subject_code,
                    type: r.subject_type || 'Core'
                },
                teacher: {
                    id: r.created_by,
                    name: teacherName
                },
                dueDate: formatDueDateTime(r.due_date),
                dueDateFormatted: formatDisplayDate(r.due_date),
                maxMarks: Number(r.max_marks) || 0,
                attachmentCount: teacherFiles.length,
                status: r.computed_status,
                submission: r.submission_id ? {
                    submissionId: r.submission_id,
                    status: r.submission_status,
                    marksObtained: Number(r.marks_obtained) || 0,
                    submittedAt: r.submitted_at
                } : null
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            studentId: studentContext.student_id,
            batchId: studentContext.batch_id,
            batchName: studentContext.batch_name,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            homeworks
        };
    }

    /**
     * Get details of a single homework item
     */
    async getDetails(tenantId, userId, homeworkId) {
        const studentContext = await appHomeworkModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const row = await appHomeworkModel.getHomeworkById(
            tenantId, 
            homeworkId, 
            studentContext.student_id, 
            studentContext.batch_id
        );

        if (!row) {
            const err = new Error('Homework not found or has been removed.');
            err.statusCode = 404;
            throw err;
        }

        const teacherName = [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(' ') || row.teacher_name || 'Faculty';
        const teacherFiles = parseJsonArray(row.teacher_attachments).map(f => {
            const filename = typeof f === 'string' ? f : (f.filename || f.fileName || f.name);
            return {
                name: typeof f === 'object' ? (f.originalName || f.name || filename) : filename,
                url: `/uploads/assignments/${filename}`
            };
        });

        const studentFiles = parseJsonArray(row.student_attachments).map(f => {
            return {
                name: f.originalName || f.fileName || f.name || 'attachment',
                url: f.fileUrl || `/uploads/homework-submissions/${f.fileName || f.name}`
            };
        });

        return {
            id: row.homework_id,
            title: row.title,
            description: row.description,
            assignmentType: row.assignment_type || 'homework',
            subject: {
                id: row.subject_id,
                name: row.subject_name,
                code: row.subject_code,
                type: row.subject_type || 'Core'
            },
            teacher: {
                id: row.created_by,
                name: teacherName,
                designation: row.teacher_designation || 'Faculty'
            },
            dueDate: formatDueDateTime(row.due_date),
            dueDateFormatted: formatDisplayDate(row.due_date),
            maxMarks: Number(row.max_marks) || 0,
            attachments: teacherFiles,
            status: row.computed_status,
            mySubmission: row.submission_id ? {
                submissionId: row.submission_id,
                status: row.submission_status,
                responseText: row.response_text || '',
                attachments: studentFiles,
                marksObtained: Number(row.marks_obtained) || 0,
                teacherFeedback: row.teacher_feedback || null,
                submittedAt: row.submitted_at,
                gradedAt: row.graded_at || null,
                graderName: row.grader_name || null
            } : null
        };
    }

    /**
     * Submit homework solution
     */
    async submit(tenantId, userId, homeworkId, body, uploadedFiles = []) {
        const studentContext = await appHomeworkModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const homework = await appHomeworkModel.getHomeworkById(
            tenantId, 
            homeworkId, 
            studentContext.student_id, 
            studentContext.batch_id
        );

        if (!homework) {
            const err = new Error('Homework not found or not assigned to your batch.');
            err.statusCode = 404;
            throw err;
        }

        // Format uploaded files
        const filesData = uploadedFiles.map(file => ({
            fileName: file.filename,
            originalName: file.originalname,
            fileUrl: `/uploads/homework-submissions/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype
        }));

        // If previously submitted files exist and no new files uploaded, keep old files
        let finalFiles = filesData;
        if (filesData.length === 0 && homework.student_attachments) {
            finalFiles = parseJsonArray(homework.student_attachments);
        }

        const responseText = body.responseText ? String(body.responseText).trim() : (homework.response_text || '');

        const submissionId = await appHomeworkModel.saveSubmission(
            tenantId, 
            homeworkId, 
            studentContext.student_id, 
            { responseText, files: finalFiles }
        );

        return {
            submissionId,
            homeworkId: Number(homeworkId),
            studentId: studentContext.student_id,
            status: 'submitted',
            submittedAt: new Date().toISOString(),
            filesCount: finalFiles.length,
            message: 'Homework submitted successfully!'
        };
    }

    /**
     * Get student's submission and evaluation details
     */
    async getSubmission(tenantId, userId, homeworkId) {
        const studentContext = await appHomeworkModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const sub = await appHomeworkModel.getSubmission(tenantId, homeworkId, studentContext.student_id);
        if (!sub) {
            return {
                isSubmitted: false,
                message: 'No submission found for this homework.'
            };
        }

        const files = parseJsonArray(sub.attachments).map(f => ({
            name: f.originalName || f.fileName || f.name || 'attachment',
            url: f.fileUrl || `/uploads/homework-submissions/${f.fileName || f.name}`,
            size: f.fileSize || null
        }));

        return {
            isSubmitted: true,
            submissionId: sub.submission_id,
            homeworkId: sub.homework_id,
            homeworkTitle: sub.homework_title,
            maxMarks: Number(sub.max_marks) || 0,
            dueDate: formatDueDateTime(sub.due_date),
            status: sub.status,
            responseText: sub.response_text || '',
            attachments: files,
            marksObtained: Number(sub.marks_obtained) || 0,
            teacherFeedback: sub.teacher_feedback || null,
            submittedAt: sub.submitted_at,
            gradedAt: sub.graded_at || null,
            graderName: sub.grader_name || null
        };
    }
}

module.exports = new AppHomeworkService();
