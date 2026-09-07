const bundleModel = require('../models/bundleModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const getBundles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', levelId, branchId, status } = req.query;
        const offset = (page - 1) * limit;

        const result = await bundleModel.getBundles(resolveTenantId(req), {
            search,
            levelId,
            branchId,
            status,
            limit: Number(limit),
            offset
        });

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
        console.error('Error fetching subject bundles:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch subject bundles' });
    }
};

const getBundleById = async (req, res) => {
    try {
        const { id } = req.params;
        const bundle = await bundleModel.getBundleById(resolveTenantId(req), id);

        if (!bundle) {
            return res.status(404).json({ status: 'error', message: 'Subject bundle not found' });
        }

        res.json({ status: 'success', data: bundle });
    } catch (error) {
        console.error('Error fetching subject bundle:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch subject bundle' });
    }
};

const createBundle = async (req, res) => {
    try {
        const userId = req.user?.userId || 1;
        const { levelId, branchId, name, description, is_active, subjectIds, feeAmount } = req.body;

        if (!levelId || !branchId || !name) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields (levelId, branchId, name)'
            });
        }

        const result = await bundleModel.createBundle(resolveTenantId(req), {
            levelId,
            branchId,
            name,
            description,
            is_active,
            subjectIds,
            feeAmount
        }, userId);

        res.status(201).json({ status: 'success', message: 'Subject bundle created successfully', data: result });
    } catch (error) {
        console.error('Error creating subject bundle:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'A subject bundle with this name already exists for the level' });
        }
        if (error.code === 'INVALID_LEVEL') {
            return res.status(400).json({ status: 'error', message: 'The level does not exist' });
        }
        if (error.code === 'INVALID_BRANCH') {
            return res.status(400).json({ status: 'error', message: 'The branch does not exist' });
        }
        res.status(500).json({ status: 'error', message: 'Failed to create subject bundle' });
    }
};

const updateBundle = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || 1;

        const result = await bundleModel.updateBundle(resolveTenantId(req), id, req.body, userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Subject bundle not found' });
        }

        res.json({ status: 'success', message: 'Subject bundle updated successfully' });
    } catch (error) {
        console.error('Error updating subject bundle:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'A subject bundle with this name already exists for the level' });
        }
        if (error.code === 'INVALID_LEVEL') {
            return res.status(400).json({ status: 'error', message: 'The level does not exist' });
        }
        res.status(500).json({ status: 'error', message: 'Failed to update subject bundle' });
    }
};

const deleteBundle = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || 1;

        const success = await bundleModel.deleteBundle(resolveTenantId(req), id, userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Subject bundle not found' });
        }

        res.json({ status: 'success', message: 'Subject bundle deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject bundle:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete subject bundle' });
    }
};

module.exports = {
    getBundles,
    getBundleById,
    createBundle,
    updateBundle,
    deleteBundle
};