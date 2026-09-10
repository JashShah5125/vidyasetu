const studentModel = require('../models/studentModel');
const studentAccessService = require('../services/studentAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const getStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', batchId, bundleId, status, feeStatus } = req.query;
        const offset = (page - 1) * limit;
        const tenantId = resolveTenantId(req);

        // Resolve branch-scoped access context
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        // Branch Admins cannot override branchId in queries
        if (req.query.branchId && req.query.branchId !== 'All' && accessContext.scope === 'BRANCH') {
            if (Number(req.query.branchId) !== Number(accessContext.authorizedBranchId)) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden: You cannot query students outside your authorized branch.'
                });
            }
        }

        const result = await studentModel.getStudents(tenantId, {
            search,
            batchId,
            bundleId,
            status,
            feeStatus,
            limit: Number(limit),
            offset
        }, accessContext);

        res.json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching branch students roster:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch branch students roster'
        });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid student ID' });
        }
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const student = await studentModel.getStudentById(tenantId, id, accessContext);
        if (!student) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found or does not have active enrollment in your branch.'
            });
        }

        res.json({ status: 'success', data: student });
    } catch (error) {
        console.error('Error fetching branch student details:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch student details'
        });
    }
};

const createStudent = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const { full_name, batch_id } = req.body;
        if (!full_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required field: full_name is mandatory'
            });
        }

        // Validate batch belongs to authorized branch if provided
        if (batch_id && accessContext.scope === 'BRANCH') {
            await studentAccessService.validateBatchInBranch(tenantId, accessContext.authorizedBranchId, batch_id);
        }

        // Branch is derived from authorization context, ignoring any user-passed branch_id
        const studentPayload = {
            ...req.body,
            primary_branch_id: accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : req.body.primary_branch_id
        };

        const newStudent = await studentModel.createStudent(tenantId, studentPayload, userId, accessContext);
        res.status(201).json({
            status: 'success',
            message: 'Student registered successfully in branch roster',
            data: newStudent
        });
    } catch (error) {
        console.error('Error creating student in branch roster:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to create student'
        });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        // If batch_id updated, validate it belongs to authorized branch
        if (req.body.batch_id && accessContext.scope === 'BRANCH') {
            await studentAccessService.validateBatchInBranch(tenantId, accessContext.authorizedBranchId, req.body.batch_id);
        }

        // Strip any branch_id from update payload to prevent branch transfer via edit
        const updatePayload = { ...req.body };
        delete updatePayload.primary_branch_id;
        delete updatePayload.branch_id;

        const updatedStudent = await studentModel.updateStudent(tenantId, id, updatePayload, userId, accessContext);
        if (!updatedStudent) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found or not enrolled in your authorized branch.'
            });
        }

        res.json({
            status: 'success',
            message: 'Student updated successfully',
            data: updatedStudent
        });
    } catch (error) {
        console.error('Error updating branch student:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to update student'
        });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const success = await studentModel.deleteStudent(tenantId, id, userId, accessContext);
        if (!success) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found or not enrolled in your authorized branch.'
            });
        }

        res.json({ status: 'success', message: 'Student removed from branch roster successfully' });
    } catch (error) {
        console.error('Error deleting student from branch roster:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to delete student'
        });
    }
};

const getAcademicOptions = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const tenantId = resolveTenantId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const options = await studentModel.getAcademicOptions(tenantId, accessContext);
        res.json({ status: 'success', data: options });
    } catch (error) {
        console.error('Error fetching branch academic options:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch branch academic options'
        });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAcademicOptions
};
