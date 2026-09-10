const branchModel = require('../models/branchModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const getBranches = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
        const offset = (page - 1) * limit;

        const result = await branchModel.getBranches(resolveTenantId(req), {
            search,
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
        console.error('Error fetching branches:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getBranch = async (req, res) => {
    try {
        const { code } = req.params;
        const branch = await branchModel.getBranch(resolveTenantId(req), code);

        if (!branch) {
            return res.status(404).json({ status: 'error', message: 'Branch not found' });
        }

        res.status(200).json({ status: 'success', data: branch });
    } catch (error) {
        console.error('Error fetching branch details:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createBranch = async (req, res) => {
    try {
        const userRole = req.user?.role;
        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Branch Admins cannot create new branches.' });
        }

        const data = req.body;

        if (!data.name || !data.code) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, code)' });
        }

        const result = await branchModel.createBranch(resolveTenantId(req), data, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Branch created successfully', data: result });
    } catch (error) {
        console.error('Error creating branch:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'Branch code already exists for this institute' });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateBranch = async (req, res) => {
    try {
        const { code } = req.params;
        const data = req.body;
        const userRole = req.user?.role;

        if (!data.name || !data.code) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, code)' });
        }

        // Branch admin can only update their own assigned branch
        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, code);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage your assigned branch.' });
            }
        }

        const result = await branchModel.updateBranch(resolveTenantId(req), code, data, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Branch not found' });
        }

        res.status(200).json({ status: 'success', message: 'Branch updated successfully', data: result });
    } catch (error) {
        console.error('Error updating branch:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'Branch code already exists for this institute' });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const deleteBranch = async (req, res) => {
    try {
        const { code } = req.params;
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Branch Admins cannot delete branches.' });
        }

        const success = await branchModel.deleteBranch(resolveTenantId(req), code, req.user.userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Branch not found' });
        }

        res.status(200).json({ status: 'success', message: 'Branch deleted successfully' });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getBranchCourses = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { assignment_status = 'all', search = '' } = req.query;
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only view your assigned branch.' });
            }
        }

        const result = await branchModel.getBranchCourses(resolveTenantId(req), branchId, {
            assignment_status,
            search
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            branch: result.branch,
            total: result.total
        });
    } catch (error) {
        console.error('Error fetching branch courses:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const assignBranchCourse = async (req, res) => {
    try {
        const { branchId, courseId } = req.params;
        const { programIds } = req.body || {};
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage your assigned branch.' });
            }
        }

        const result = await branchModel.assignCourseToBranch(
            resolveTenantId(req),
            branchId,
            courseId,
            programIds,
            req.user.userId
        );

        res.status(200).json({
            status: 'success',
            message: 'Course successfully assigned to branch',
            data: result
        });
    } catch (error) {
        console.error('Error assigning course to branch:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const unassignBranchCourse = async (req, res) => {
    try {
        const { branchId, courseId } = req.params;
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage your assigned branch.' });
            }
        }

        const result = await branchModel.unassignCourseFromBranch(
            resolveTenantId(req),
            branchId,
            courseId,
            req.user.userId
        );

        res.status(200).json({
            status: 'success',
            message: 'Course successfully unassigned from branch',
            data: result
        });
    } catch (error) {
        console.error('Error unassigning course from branch:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const batchAssignBranchCourses = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { assignments, courseIds } = req.body || {};
        const items = assignments || courseIds || [];
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage your assigned branch.' });
            }
        }

        const result = await branchModel.batchAssignCoursesToBranch(
            resolveTenantId(req),
            branchId,
            items,
            req.user.userId
        );

        res.status(200).json({
            status: 'success',
            message: 'Courses successfully assigned to branch',
            data: result
        });
    } catch (error) {
        console.error('Error batch assigning courses to branch:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const toggleBranchProgram = async (req, res) => {
    try {
        const { branchId, programId } = req.params;
        const { assign = true } = req.body || {};
        const userRole = req.user?.role;

        if (userRole === 'branch-admin' || userRole === 'branch_admin') {
            const hasAccess = await branchModel.verifyUserBranchAccess(resolveTenantId(req), req.user.userId, branchId);
            if (!hasAccess) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: You can only manage your assigned branch.' });
            }
        }

        const result = await branchModel.toggleBranchProgramAssignment(
            resolveTenantId(req),
            branchId,
            programId,
            Boolean(assign),
            req.user.userId
        );

        res.status(200).json({
            status: 'success',
            message: assign ? 'Program assigned to branch' : 'Program unassigned from branch',
            data: result
        });
    } catch (error) {
        console.error('Error toggling branch program:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

module.exports = {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchCourses,
    assignBranchCourse,
    unassignBranchCourse,
    batchAssignBranchCourses,
    toggleBranchProgram
};