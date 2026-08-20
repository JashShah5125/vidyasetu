const tenantService = require('../services/tenantService');

const getTenants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', plan = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await tenantService.getTenants(limit, offset, search, status, plan);
        
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
        console.error('Error fetching tenants:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getTenantById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await tenantService.getTenantById(id);
        
        if (!tenant) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        res.status(200).json({ status: 'success', data: tenant });
    } catch (error) {
        console.error('Error fetching tenant details:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createTenant = async (req, res) => {
    try {
        // Validate request body
        const { name, legal_name, slug, adminEmail, adminPassword, planId } = req.body;
        
        if (!name || !slug || !adminEmail || !adminPassword) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields' });
        }

        const result = await tenantService.createTenantWithAdmin({
            name, legal_name, slug, adminEmail, adminPassword, planId
        });

        res.status(201).json({ status: 'success', message: 'Tenant created successfully', data: result });
    } catch (error) {
        console.error('Error creating tenant:', error);
        if (error.message === 'Tenant slug already exists') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateTenantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended', 'deactivated'].includes(status)) {
            return res.status(400).json({ status: 'error', message: 'Invalid status' });
        }

        const success = await tenantService.updateTenantStatus(id, status);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        res.status(200).json({ status: 'success', message: `Tenant status updated to ${status}` });
    } catch (error) {
        console.error('Error updating tenant status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getTenants,
    getTenantById,
    createTenant,
    updateTenantStatus
};
