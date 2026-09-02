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

        if (!data.name || !data.code) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, code)' });
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

module.exports = {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch
};