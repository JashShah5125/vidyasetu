const batchModel = require('../models/batchModel');
const branchModel = require('../models/branchModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const isBranchAdmin = (role) => role === 'branch-admin' || role === 'branch_admin';

const ERROR_HANDLERS = {
    ER_DUP_ENTRY: [409, 'A batch with this code already exists in this academic year for this branch'],
    ER_BRANCH_NOT_FOUND: [400, 'Branch not found for this institute'],
    ER_AY_NOT_FOUND: [400, 'Academic year not found for this branch'],
    ER_LEVEL_NOT_FOUND: [400, 'Level not found for this institute'],
    ER_CLASSROOM_NOT_FOUND: [400, 'Classroom not found for this branch'],
    ER_LEVEL_NOT_ASSIGNED_TO_BRANCH: [422, 'The selected level/program is not assigned to this branch'],
    ER_BATCH_HAS_DEPENDENCIES: [409, 'Cannot delete batch with enrolled students or scheduled lectures. Please deactivate instead.'],
    ER_BATCH_REQUIRED: [400, 'Missing required fields (name, branchId, academicYearId, levelId)']
};

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    const handler = ERROR_HANDLERS[error.code];
    if (handler) {
        const [status, defaultMessage] = handler;
        return res.status(status).json({ status: 'error', message: error.message || defaultMessage });
    }
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
};

const getBatches = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', status = 'all', branch = 'all', course = 'all', program = 'all', level = 'all', academicYear = 'all' } = req.query;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        // Branch admin authorization & automatic branch scoping
        if (isBranchAdmin(userRole)) {
            if (branch && branch !== 'all') {
                const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, branch);
                if (!hasAccess) {
                    return res.status(403).json({ status: 'error', message: 'Forbidden: You can only view batches for your assigned branch.' });
                }
            } else {
                const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
                if (!userBranchIds.length) {
                    return res.status(200).json({
                        status: 'success',
                        data: [],
                        pagination: { total: 0, page: Number(page), limit: Number(limit) }
                    });
                }
                branch = String(userBranchIds[0]);
            }
        }

        const offset = (page - 1) * limit;

        const result = await batchModel.getBatches(tenantId, {
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
        const tenantId = resolveTenantId(req);
        const batch = await batchModel.getBatch(tenantId, id);

        if (!batch) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        const userRole = req.user?.role;
        if (isBranchAdmin(userRole)) {
            const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, batch.branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only view batches for your assigned branch.' });
            }
        }

        res.status(200).json({ status: 'success', data: batch });
    } catch (error) {
        handleError(res, error, 'Error fetching batch details:');
    }
};

const createBatch = async (req, res) => {
    try {
        const data = req.body;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        if (isBranchAdmin(userRole)) {
            const targetBranch = data.branch_id || data.branchId;
            if (!targetBranch) {
                const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
                if (userBranchIds.length) {
                    data.branch_id = userBranchIds[0];
                }
            } else {
                const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, targetBranch);
                if (!hasAccess) {
                    return res.status(403).json({ status: 'error', message: 'Forbidden: You can only create batches for your assigned branch.' });
                }
            }
        }

        const result = await batchModel.createBatch(tenantId, data, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Batch created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating batch:');
    }
};

const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        if (isBranchAdmin(userRole)) {
            const existingBatch = await batchModel.getBatch(tenantId, id);
            if (!existingBatch) {
                return res.status(404).json({ status: 'error', message: 'Batch not found' });
            }
            const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, existingBatch.branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only update batches for your assigned branch.' });
            }

            const targetBranch = data.branch_id || data.branchId;
            if (targetBranch && String(targetBranch) !== String(existingBatch.branchId)) {
                const hasTargetAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, targetBranch);
                if (!hasTargetAccess) {
                    return res.status(403).json({ status: 'error', message: 'Forbidden: You cannot transfer batches to another branch.' });
                }
            }
        }

        const result = await batchModel.updateBatch(tenantId, id, data, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        res.status(200).json({ status: 'success', message: 'Batch updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating batch:');
    }
};

const toggleBatchStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        if (!status) {
            return res.status(400).json({ status: 'error', message: 'Status is required' });
        }

        if (isBranchAdmin(userRole)) {
            const existingBatch = await batchModel.getBatch(tenantId, id);
            if (!existingBatch) {
                return res.status(404).json({ status: 'error', message: 'Batch not found' });
            }
            const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, existingBatch.branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage batches for your assigned branch.' });
            }
        }

        const success = await batchModel.toggleBatchStatus(tenantId, id, status, req.user.userId);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        res.status(200).json({ status: 'success', message: `Batch status updated to ${status}` });
    } catch (error) {
        handleError(res, error, 'Error updating batch status:');
    }
};

const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        if (isBranchAdmin(userRole)) {
            const existingBatch = await batchModel.getBatch(tenantId, id);
            if (!existingBatch) {
                return res.status(404).json({ status: 'error', message: 'Batch not found' });
            }
            const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, existingBatch.branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only delete batches for your assigned branch.' });
            }
        }

        const success = await batchModel.deleteBatch(tenantId, id, req.user.userId);

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
        let { branch = 'all' } = req.query;
        const tenantId = resolveTenantId(req);
        const userRole = req.user?.role;

        if (isBranchAdmin(userRole)) {
            if (branch && branch !== 'all') {
                const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, branch);
                if (!hasAccess) {
                    return res.status(403).json({ status: 'error', message: 'Forbidden: You can only view academic years for your assigned branch.' });
                }
            } else {
                const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
                if (userBranchIds.length) {
                    branch = String(userBranchIds[0]);
                }
            }
        }

        const data = await batchModel.getAcademicYears(tenantId, branch);

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
    toggleBatchStatus,
    deleteBatch,
    getAcademicYears
};