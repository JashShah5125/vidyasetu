const batchModel = require('../models/batchModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const ERROR_HANDLERS = {
    ER_DUP_ENTRY: [409, 'A batch with this code already exists in this academic year for this branch'],
    ER_BRANCH_NOT_FOUND: [400, 'Branch not found for this institute'],
    ER_AY_NOT_FOUND: [400, 'Academic year not found for this branch'],
    ER_LEVEL_NOT_FOUND: [400, 'Level not found for this institute'],
    ER_CLASSROOM_NOT_FOUND: [400, 'Classroom not found for this branch'],
    ER_BATCH_REQUIRED: [400, 'Missing required fields (name, branchId, academicYearId, levelId)']
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

const getBatches = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', branch = 'all', course = 'all', program = 'all', level = 'all', academicYear = 'all' } = req.query;
        const offset = (page - 1) * limit;

        const result = await batchModel.getBatches(resolveTenantId(req), {
            search,
            status,
            branch,
            course,
            program,
            level,
            academicYear,
            limit: Number(limit),
            offset
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching batches:');
    }
};

const getBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const batch = await batchModel.getBatch(resolveTenantId(req), id);

        if (!batch) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        res.status(200).json({ status: 'success', data: batch });
    } catch (error) {
        handleError(res, error, 'Error fetching batch details:');
    }
};

const createBatch = async (req, res) => {
    try {
        const data = req.body;

        const result = await batchModel.createBatch(resolveTenantId(req), data, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Batch created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating batch:');
    }
};

const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const result = await batchModel.updateBatch(resolveTenantId(req), id, data, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        res.status(200).json({ status: 'success', message: 'Batch updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating batch:');
    }
};

const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await batchModel.deleteBatch(resolveTenantId(req), id, req.user.userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        res.status(200).json({ status: 'success', message: 'Batch deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Error deleting batch:');
    }
};

const getAcademicYears = async (req, res) => {
    try {
        const { branch = 'all' } = req.query;
        const data = await batchModel.getAcademicYears(resolveTenantId(req), branch);

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Error fetching academic years:');
    }
};

module.exports = {
    getBatches,
    getBatch,
    createBatch,
    updateBatch,
    deleteBatch,
    getAcademicYears
};