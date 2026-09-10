const classroomModel = require('../models/classroomModel');
const branchModel = require('../models/branchModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const isBranchAdmin = (role) => role === 'branch-admin' || role === 'branch_admin';

const ERROR_HANDLERS = {
    ER_DUP_ENTRY: [409, 'A classroom with this room number already exists in this branch'],
    ER_BRANCH_NOT_FOUND: [400, 'Branch not found for this institute'],
    ER_INVALID_INPUT: [400, 'Invalid input provided for classroom'],
    ER_CLASSROOM_HAS_DEPENDENCIES: [409, 'Classroom cannot be deleted because it is assigned to active batches or scheduled lectures.']
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

// Enforces branch access for branch admins
const authorizeBranch = async (req, branchId) => {
    const tenantId = resolveTenantId(req);
    const userRole = req.user?.role;
    if (isBranchAdmin(userRole)) {
        if (!branchId || branchId === 'all') {
            const branchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
            if (!branchIds.length) return null;
            return String(branchIds[0]);
        }
        const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, req.user.userId, branchId);
        if (!hasAccess) {
            const err = new Error('Forbidden: You are not authorized to access this branch.');
            err.status = 403;
            throw err;
        }
    }
    return branchId;
};

const getClassrooms = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        let branchId = req.params.branchId || req.query.branchId || req.query.branch || 'all';
        
        try {
            branchId = await authorizeBranch(req, branchId);
            if (branchId === null) {
                return res.status(200).json({
                    status: 'success',
                    data: [],
                    pagination: { total: 0, page: 1, limit: 10 }
                });
            }
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        const { page = 1, limit = 10, search = '', type = 'all', status = 'all' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const result = await classroomModel.getClassrooms(tenantId, {
            branchId,
            search,
            type,
            status,
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
        handleError(res, error, 'Error fetching classrooms:');
    }
};

const getClassroom = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id, classroomId } = req.params;
        const targetId = classroomId || id;
        let branchId = req.params.branchId || 'all';

        try {
            branchId = await authorizeBranch(req, branchId);
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        const classroom = await classroomModel.getClassroom(tenantId, branchId, targetId);

        if (!classroom) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', data: classroom });
    } catch (error) {
        handleError(res, error, 'Error fetching classroom details:');
    }
};

const createClassroom = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const branchIdentifier = req.params.branchId || req.body.branchId || req.body.branch_id;
        const data = req.body;

        if (!branchIdentifier) {
            return res.status(400).json({ status: 'error', message: 'Branch ID is required to create a classroom' });
        }

        try {
            await authorizeBranch(req, branchIdentifier);
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        if (!data.name || !String(data.name).trim()) {
            return res.status(400).json({ status: 'error', message: 'Classroom name is required' });
        }

        const result = await classroomModel.createClassroom(tenantId, branchIdentifier, data, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Classroom created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating classroom:');
    }
};

const updateClassroom = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id, classroomId } = req.params;
        const targetId = classroomId || id;
        const branchIdentifier = req.params.branchId || req.body.branchId || req.body.branch_id || 'all';
        const data = req.body;

        try {
            await authorizeBranch(req, branchIdentifier);
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        const result = await classroomModel.updateClassroom(tenantId, branchIdentifier, targetId, data, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', message: 'Classroom updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating classroom:');
    }
};

const changeClassroomStatus = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id, classroomId } = req.params;
        const targetId = classroomId || id;
        const branchIdentifier = req.params.branchId || 'all';
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ status: 'error', message: 'Status is required' });
        }

        try {
            await authorizeBranch(req, branchIdentifier);
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        const result = await classroomModel.changeClassroomStatus(tenantId, branchIdentifier, targetId, status, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', message: `Classroom status updated to ${result.status}`, data: result });
    } catch (error) {
        handleError(res, error, 'Error changing classroom status:');
    }
};

const deleteClassroom = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id, classroomId } = req.params;
        const targetId = classroomId || id;
        const branchIdentifier = req.params.branchId || 'all';

        try {
            await authorizeBranch(req, branchIdentifier);
        } catch (authErr) {
            return res.status(authErr.status || 403).json({ status: 'error', message: authErr.message });
        }

        const success = await classroomModel.deleteClassroom(tenantId, branchIdentifier, targetId, req.user.userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', message: 'Classroom deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Error deleting classroom:');
    }
};

module.exports = {
    getClassrooms,
    getClassroom,
    createClassroom,
    updateClassroom,
    changeClassroomStatus,
    deleteClassroom
};