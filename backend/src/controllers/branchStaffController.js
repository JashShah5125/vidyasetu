const staffModel = require('../models/staffModel');
const staffAccessService = require('../services/staffAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const getStaffList = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { page = 1, limit = 50, search, employeeType, department, role, status } = req.query;

        // Resolve branch-scoped access context
        const accessContext = await staffAccessService.resolveAccessContext(tenantId, req.user);

        // Branch Admins cannot query other branches
        if (req.query.branchId && req.query.branchId !== 'All' && accessContext.scope === 'BRANCH') {
            if (Number(req.query.branchId) !== Number(accessContext.authorizedBranchId)) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden: You cannot query staff outside your authorized branch.'
                });
            }
        }

        const filters = {
            search,
            employeeType,
            department,
            role,
            status,
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
        };

        const result = await staffModel.getStaffList(tenantId, filters, accessContext);

        res.status(200).json({
            message: 'Branch staff list retrieved successfully.',
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(result.total / parseInt(limit, 10))
            }
        });
    } catch (error) {
        console.error('Error fetching branch staff list:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Internal server error while fetching branch staff list.'
        });
    }
};

const getStaffById = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const staffId = req.params.id;
        const accessContext = await staffAccessService.resolveAccessContext(tenantId, req.user);

        const staff = await staffModel.getStaffById(tenantId, staffId, accessContext);
        if (!staff) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff member not found or does not have access in your branch.'
            });
        }

        res.status(200).json({
            message: 'Branch staff member retrieved successfully.',
            data: staff
        });
    } catch (error) {
        console.error('Error fetching branch staff member:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Internal server error while fetching branch staff member.'
        });
    }
};

const createStaff = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const creatorUserId = req.user?.userId || req.user?.id || 201;
        const staffData = req.body;
        const accessContext = await staffAccessService.resolveAccessContext(tenantId, req.user);

        if (!staffData.firstName || !staffData.lastName || !staffData.employeeType) {
            return res.status(400).json({
                status: 'error',
                message: 'First Name, Last Name, and Employee Type are required.'
            });
        }

        const result = await staffModel.createStaff(tenantId, staffData, creatorUserId, accessContext);

        res.status(201).json({
            message: 'Staff member created successfully in your branch.',
            data: {
                userId: result.userId,
                profileId: result.profileId
            }
        });
    } catch (error) {
        console.error('Error creating branch staff:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Internal server error while creating branch staff.'
        });
    }
};

const updateStaff = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const staffId = req.params.id;
        const staffData = req.body;
        const accessContext = await staffAccessService.resolveAccessContext(tenantId, req.user);

        const result = await staffModel.updateStaff(tenantId, staffId, staffData, accessContext);

        res.status(200).json({
            message: 'Branch staff member updated successfully.',
            data: result
        });
    } catch (error) {
        console.error('Error updating branch staff:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Internal server error while updating branch staff.'
        });
    }
};

const deleteStaff = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const staffId = req.params.id;
        const accessContext = await staffAccessService.resolveAccessContext(tenantId, req.user);

        const result = await staffModel.deleteStaff(tenantId, staffId, accessContext);

        res.status(200).json({
            message: 'Branch staff member deleted successfully.',
            data: result
        });
    } catch (error) {
        console.error('Error deleting branch staff:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Internal server error while deleting branch staff.'
        });
    }
};

module.exports = {
    getStaffList,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff
};
