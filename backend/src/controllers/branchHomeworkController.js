const homeworkModel = require('../models/homeworkModel');
const studentAccessService = require('../services/studentAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const resolveUserId = (req) => req.user && (req.user.userId || req.user.id);

const ERROR_HANDLERS = {
    ER_DUP_ENTRY: [409, 'This record already exists'],
    ER_HW_REQUIRED: [400, 'Missing required fields (title, subjectId, academicYearId, dueDate)'],
    ER_HW_BATCH_REQUIRED: [400, 'At least one target batch is required'],
    ER_HW_BATCH_INVALID: [400, 'One or more target batches are invalid for your branch / academic year'],
    ER_HW_LOCKED: [400, 'Target batches cannot be changed once the homework is published'],
    ER_HW_MARKS_REQUIRED: [400, 'Marks are required for grading'],
    ER_BRANCH_NOT_FOUND: [400, 'Branch not found for this institute'],
    ER_AY_NOT_FOUND: [400, 'Academic year not found for this branch'],
    ER_SUBJECT_NOT_FOUND: [400, 'Subject not found for this institute'],
    ER_HW_NOT_FOUND: [404, 'Homework not found'],
    ER_FORBIDDEN_BRANCH: [403, 'Forbidden: You do not have access to homework belonging to another branch']
};

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    const handler = ERROR_HANDLERS[error.code];
    if (handler) {
        const [status, message] = handler;
        return res.status(status).json({ status: 'error', message });
    }
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
};

const coerceFiles = (req) => {
    const prefix = '/uploads/homework';
    const uploaded = req.files && req.files.length
        ? req.files.map(f => `${prefix}/${f.filename}`)
        : [];
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
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH' && !accessContext.authorizedBranchId) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: No active branch assigned to your account.'
            });
        }

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? Number(req.query.branchId) : null);
        if (!branchId) {
            const data = await homeworkModel.getTeacherScoping(tenantId, resolveUserId(req));
            return res.status(200).json({ status: 'success', data });
        }

        const data = await homeworkModel.getBranchScoping(tenantId, branchId);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching branch scoping:');
    }
};

const getHomeworks = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const { status = 'all', subject = 'all', batch = 'all', search = '', assignmentType = 'all' } = req.query;
        const data = await homeworkModel.getHomeworks(tenantId, resolveUserId(req), {
            status, subject, batch, search, assignmentType
        }, accessContext);

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching branch homeworks:');
    }
};

const getHomework = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const homework = await homeworkModel.getHomework(tenantId, id, resolveUserId(req), accessContext);
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
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const payload = {
            ...req.body,
            batchIds: parseBatchIds(req),
            files: coerceFiles(req)
        };
        const result = await homeworkModel.createHomework(tenantId, payload, resolveUserId(req), accessContext);
        res.status(201).json({ status: 'success', message: 'Homework draft created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating branch homework:');
    }
};

const updateHomework = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const payload = {
            ...req.body,
            batchIds: parseBatchIds(req),
            files: coerceFiles(req)
        };
        const result = await homeworkModel.updateHomework(tenantId, id, payload, resolveUserId(req), accessContext);
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', message: 'Homework updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating branch homework:');
    }
};

const deleteHomework = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const result = await homeworkModel.deleteHomework(tenantId, id, accessContext);
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'active') {
            return res.status(400).json({ status: 'error', message: 'Published homework must be closed before it can be deleted' });
        }
        res.status(200).json({ status: 'success', message: 'Homework deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Error deleting branch homework:');
    }
};

const publishHomework = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const result = await homeworkModel.publishHomework(tenantId, id, resolveUserId(req), accessContext);
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'closed') {
            return res.status(400).json({ status: 'error', message: 'Closed homework cannot be re-published' });
        }
        res.status(200).json({ status: 'success', message: 'Homework published successfully' });
    } catch (error) {
        handleError(res, error, 'Error publishing branch homework:');
    }
};

const closeHomework = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const result = await homeworkModel.closeHomework(tenantId, id, resolveUserId(req), accessContext);
        if (result === 'not_found') {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        if (result === 'not_published') {
            return res.status(400).json({ status: 'error', message: 'Only published homework can be closed' });
        }
        res.status(200).json({ status: 'success', message: 'Homework closed successfully' });
    } catch (error) {
        handleError(res, error, 'Error closing branch homework:');
    }
};

const getEvaluationRoster = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const result = await homeworkModel.getEvaluationRoster(tenantId, id, accessContext);
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Homework not found' });
        }
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        handleError(res, error, 'Error fetching branch evaluation roster:');
    }
};

const gradeSubmission = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id, submissionId } = req.params;

        const result = await homeworkModel.gradeSubmission(
            tenantId, id, submissionId,
            { ...req.body, marksObtained: req.body.marksObtained ?? req.body.marks_obtained },
            resolveUserId(req),
            accessContext
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
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;
        const { rows } = req.body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No grade records provided in payload' });
        }
        const result = await homeworkModel.bulkGradeSubmissions(tenantId, id, rows, resolveUserId(req), accessContext);
        res.status(200).json({ status: 'success', message: `Processed ${result.successCount} grades`, data: result });
    } catch (error) {
        handleError(res, error, 'Error bulk grading branch homework:');
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
    getEvaluationRoster,
    gradeSubmission,
    bulkGradeHomework
};
