const tenantModel = require('../models/tenantModel');
const planModel = require('../models/planModel');

const getProfile = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const tenant = await tenantModel.getTenantById(tenantId);

        if (!tenant) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        let plan = null;
        if (tenant.plan_id) {
            plan = await planModel.getPlanById(tenant.plan_id);
        }

        res.status(200).json({ status: 'success', data: { tenant, plan } });
    } catch (error) {
        console.error('Error fetching institute profile:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { adminEmail, alternateEmails, mobile, address } = req.body || {};

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[0-9]{10}$/;

        if (adminEmail && !emailRegex.test(adminEmail)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Email is incorrectly formatted' });
        }
        if (mobile && !mobileRegex.test(mobile)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Mobile Number must be exactly 10 digits' });
        }

        const tenant = await tenantModel.getTenantById(tenantId);
        if (!tenant) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        const payload = {};
        if (adminEmail !== undefined) payload.adminEmail = adminEmail;
        if (alternateEmails !== undefined) payload.alternateEmails = alternateEmails;
        if (mobile !== undefined) payload.mobile = mobile;
        if (address !== undefined) payload.address = address;

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No editable fields provided' });
        }

        await tenantModel.updateTenant(tenantId, payload);

        res.status(200).json({
            status: 'success',
            message: 'Institute profile updated successfully',
            data: { updatedFields: Object.keys(payload) }
        });
    } catch (error) {
        console.error('Error updating institute profile:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getProfile,
    updateProfile
};