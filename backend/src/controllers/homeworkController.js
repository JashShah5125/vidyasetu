const homeworkModel = require('../models/homeworkModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;
const resolveUserId = (req) => req.user && req.user.userId;

const ERROR_HANDLERS = {
    ER_DUP_ENTRY: [409, 'This record already exists'],
    ER_HW_REQUIRED: [400, 'Missing required fields (title, subjectId, branchId, academicYearId, dueDate)'],
    ER_HW_BATCH_REQUIRED: [400, 'At least one target batch is required'],
    ER_HW_BATCH_INVALID: [400, 'One or more target batches are invalid for this branch/academic year'],
    ER_HW_LOCKED: [400, 'Target batches cannot be changed once the homework is published'],
    ER_HW_MARKS_REQUIRED: [400, 'Marks are required for grading'],
    ER_BRANCH_NOT_FOUND: [400, 'Branch not found for this institute'],
    ER_AY_NOT_FOUND: [400, 'Academic year not found for this branch'],
    ER_SUBJECT_NOT_FOUND: [400, 'Subject not found for this institute']
};

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    const handler = ERROR_HANDLERS[error.code];
    if (handler) {
        const [status, message] = handler;
        return res.status(status).json({ status: 'error', message });
    }
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
};

const coerceFiles = (req) => {
    // Multer-uploaded files -> URLs served from /uploads/...
    // Uploaded files land in uploads/homework or uploads/homework-submissions.
    const prefix = req.originalUrl.includes('/student/') ? '/uploads/homework-submissions' : '/uploads/homework';
    const uploaded = req.files && req.files.length
        ? req.files.map(f => `${prefix}/${f.filename}`)
        : [];
    // Existing URLs carried over (JSON body, or FormData string field).
    const existingRaw = req.body.existingFiles ?? req.body.files ?? req.body.fileUrls ?? [];
    let existing = [];
    if (typeof existingRaw === 'string') {
        try {
            const parsed = JSON.parse(existingRaw);
            existing = Array.isArray(parsed) ? parsed : existingRaw.split(',').filter(Boolean);
        } catch (e) {
            existing = existingRaw.split(',').filter(Boolean);
        }
    } else if (Array.isArray(existingRaw)) {
        existing = existingRaw;
    }
    return [...existing, ...uploaded];
};

const parseBatchIds = (req) => {
    const raw = req.body.batchIds ?? req.body.batch_ids;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : String(raw).split(',').filter(Boolean);
        } catch (e) {
            return String(raw).split(',').filter(Boolean);
        }
    }
    return [];
};

const getScoping = async (req, res) => {
    try {
        const data = await homeworkModel.getTeacherScoping(resolveTenantId(req), resolveUserId(req));
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching teacher scoping:');
    }
};

const getHomeworks = async (req, res) => {
    try {
        const { status = 'all', subject = 'all', batch = 'all', branch = 'all', search = '', assignmentType = 'all' } = req.query;
        const data = await homeworkModel.getHomeworks(resolveTenantId(req), resolveUserId(req), {
            status, subject, batch, branch, search, assignmentType
        });
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching homeworks:');
    }
};

const getHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await homeworkModel.getHomework(resolveTenantId(req), id, resolveUserId(req));
        if (!homework) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', data: homework });
    } catch (error) {
        handleError(res, error, 'Error fetching homework details:');
    }
};

const createHomework = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            batchIds: parseBatchIds(req),
            files: coerceFiles(req)
        };
        const result = await homeworkModel.createHomework(resolveTenantId(req), payload, resolveUserId(req));
        res.status(201).json({ status: 'success', message: 'Homework draft created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating homework:');
    }
};

const updateHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = {
            ...req.body,
            batchIds: parseBatchIds(req),
            files: coerceFiles(req)
        };
        const result = await homeworkModel.updateHomework(resolveTenantId(req), id, payload, resolveUserId(req));
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', message: 'Homework updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating homework:');
    }
};

const deleteHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await homeworkModel.deleteHomework(resolveTenantId(req), id);
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'active') {
            return res.status(400).json({ status: 'error', message: 'Published homework must be closed before it can be deleted' });
        }
        res.status(200).json({ status: 'success', message: 'Homework deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Error deleting homework:');
    }
};

const publishHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await homeworkModel.publishHomework(resolveTenantId(req), id, resolveUserId(req));
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'closed') {
            return res.status(400).json({ status: 'error', message: 'Closed homework cannot be re-published' });
        }
        res.status(200).json({ status: 'success', message: 'Homework published successfully' });
    } catch (error) {
        handleError(res, error, 'Error publishing homework:');
    }
};

const closeHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await homeworkModel.closeHomework(resolveTenantId(req), id, resolveUserId(req));
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'not_published') {
            return res.status(400).json({ status: 'error', message: 'Only published homework can be closed' });
        }
        res.status(200).json({ status: 'success', message: 'Homework closed successfully' });
    } catch (error) {
        handleError(res, error, 'Error closing homework:');
    }
};

const getSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await homeworkModel.getSubmissions(resolveTenantId(req), id);
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        handleError(res, error, 'Error fetching submissions:');
    }
};

const getEvaluationRoster = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await homeworkModel.getEvaluationRoster(resolveTenantId(req), id);
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        handleError(res, error, 'Error fetching evaluation roster:');
    }
};

const gradeSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        const result = await homeworkModel.gradeSubmission(
            resolveTenantId(req), id, submissionId,
            { ...req.body, marksObtained: req.body.marksObtained ?? req.body.marks_obtained },
            resolveUserId(req)
        );
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Submission not found' });
        }
        res.status(200).json({ status: 'success', message: 'Submission graded successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error grading submission:');
    }
};

const bulkGradeHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No grade records provided in payload' });
        }
        const result = await homeworkModel.bulkGradeSubmissions(resolveTenantId(req), id, rows, resolveUserId(req));
        res.status(200).json({ status: 'success', message: `Processed ${result.successCount} grades`, data: result });
    } catch (error) {
        handleError(res, error, 'Error bulk grading homework:');
    }
};

// ─── Student-facing ─────────────────────────────────────────────────────────

const resolveStudent = async (req, res) => {
    const tenantId = resolveTenantId(req);
    const studentId = await homeworkModel.resolveStudentByUserId(tenantId, resolveUserId(req));
    if (!studentId) {
        res.status(403).json({ status: 'error', message: 'No student profile linked to this account' });
        return null;
    }
    return { tenantId, studentId: Number(studentId) };
};

const getStudentHomeworks = async (req, res) => {
    try {
        const ctx = await resolveStudent(req);
        if (!ctx) return;
        const data = await homeworkModel.getStudentHomeworks(ctx.tenantId, ctx.studentId);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching student homeworks:');
    }
};

const getStudentHomework = async (req, res) => {
    try {
        const ctx = await resolveStudent(req);
        if (!ctx) return;
        const { id } = req.params;
        const homework = await homeworkModel.getStudentHomework(ctx.tenantId, ctx.studentId, id);
        if (!homework) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', data: homework });
    } catch (error) {
        handleError(res, error, 'Error fetching homework details:');
    }
};

const submitHomework = async (req, res) => {
    try {
        const ctx = await resolveStudent(req);
        if (!ctx) return;
        const { id } = req.params;
        const result = await homeworkModel.submitHomework(ctx.tenantId, ctx.studentId, id, {
            responseText: req.body.responseText ?? req.body.response_text ?? '',
            files: coerceFiles(req)
        });
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'not_open') {
            return res.status(400).json({ status: 'error', message: 'Homework is not open for submissions' });
        }
        if (result === 'not_assigned') {
            return res.status(403).json({ status: 'error', message: 'Homework is not assigned to your batch' });
        }
        res.status(201).json({ status: 'success', message: 'Homework submitted successfully' });
    } catch (error) {
        handleError(res, error, 'Error submitting homework:');
    }
};

module.exports = {
    getScoping,
    getHomeworks,
    getHomework,
    createHomework,
    updateHomework,
    deleteHomework,
    publishHomework,
    closeHomework,
    getSubmissions,
    gradeSubmission,
    bulkGradeHomework,
    getEvaluationRoster,
    getStudentHomeworks,
    getStudentHomework,
    submitHomework
};