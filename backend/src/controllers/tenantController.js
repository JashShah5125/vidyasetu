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
        const { 
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, 
            panNo, gstNo, mobile, timezone, billingCycle, alternate_emails,
            discount, finalPrice, tax, invoiceNumber, maxBranches, maxStaffUsers, maxStudents, maxParents, 
            maxTeachers, maxStorage, maxFileSize, maxSmsCredits, maxWhatsappMsgs
        } = req.body;
        
        if (!name || !slug || !adminEmail) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, slug, email)' });
        }

        // Data Validation Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;
        const slugRegex = /^[a-z0-9-]+$/;

        if (!slugRegex.test(slug)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Slug can only contain lowercase letters, numbers, and hyphens' });
        }
        if (!emailRegex.test(adminEmail)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Admin Email is incorrectly formatted' });
        }
        if (mobile && !mobileRegex.test(mobile)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Mobile Number must be exactly 10 digits' });
        }
        if (panNo && !panRegex.test(panNo.toUpperCase())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: PAN Number must be 10 alphanumeric characters (e.g., ABCDE1234F)' });
        }
        if (gstNo && !gstRegex.test(gstNo.toUpperCase())) {
             return res.status(400).json({ status: 'error', message: 'Invalid format: GSTIN is incorrectly formatted' });
        }
        if (pincode && !pincodeRegex.test(pincode)) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Pincode must be exactly 6 digits' });
        }

        let logoUrl = null;
        if (req.file) {
            logoUrl = `/uploads/tenants/logo/${req.file.filename}`;
        }

        let parsedAltEmails = null;
        if (alternate_emails) {
            try { parsedAltEmails = JSON.parse(alternate_emails); } catch (e) {}
        }

        const parseNum = (val) => val === undefined || val === '' || val === 'null' ? undefined : Number(val);
        
        const result = await tenantService.createTenantWithAdmin({
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, gstNo, mobile, timezone, billingCycle, logoUrl, alternateEmails: parsedAltEmails,
            discount: parseNum(discount),
            finalPrice: parseNum(finalPrice),
            tax: parseNum(tax),
            invoiceNumber,
            maxBranches: parseNum(maxBranches),
            maxStaffUsers: parseNum(maxStaffUsers),
            maxStudents: parseNum(maxStudents),
            maxParents: parseNum(maxParents),
            maxTeachers: parseNum(maxTeachers),
            maxStorage,
            maxFileSize,
            maxSmsCredits: parseNum(maxSmsCredits),
            maxWhatsappMsgs: parseNum(maxWhatsappMsgs)
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

const updateTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, gstNo, mobile, timezone, billingCycle, alternate_emails,
            discount, finalPrice, tax, invoiceNumber, maxBranches, maxStaffUsers, maxStudents, maxParents, 
            maxTeachers, maxStorage, maxFileSize, maxSmsCredits, maxWhatsappMsgs
        } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;

        if (adminEmail && !emailRegex.test(adminEmail)) return res.status(400).json({ status: 'error', message: 'Invalid format: Admin Email is incorrectly formatted' });
        if (mobile && !mobileRegex.test(mobile)) return res.status(400).json({ status: 'error', message: 'Invalid format: Mobile Number must be exactly 10 digits' });
        if (panNo && !panRegex.test(panNo.toUpperCase())) return res.status(400).json({ status: 'error', message: 'Invalid format: PAN Number must be 10 alphanumeric characters' });
        if (gstNo && !gstRegex.test(gstNo.toUpperCase())) return res.status(400).json({ status: 'error', message: 'Invalid format: GSTIN is incorrectly formatted' });
        if (pincode && !pincodeRegex.test(pincode)) return res.status(400).json({ status: 'error', message: 'Invalid format: Pincode must be exactly 6 digits' });

        let logoUrl;
        console.log("DEBUG: updateTenant req.file =", req.file, "req.body.logo =", req.body.logo, "req.body.removeLogo =", req.body.removeLogo);
        if (req.file) {
            logoUrl = `/uploads/tenants/logo/${req.file.filename}`;
        } else if (req.body.removeLogo === 'true') {
            logoUrl = null;
        }

        let parsedAltEmails;
        if (alternate_emails) {
            try { parsedAltEmails = JSON.parse(alternate_emails); } catch (e) {}
        }

        const parseNum = (val) => val === undefined || val === '' || val === 'null' ? undefined : Number(val);

        const success = await tenantService.updateTenant(id, {
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, gstNo, mobile, timezone, billingCycle, alternateEmails: parsedAltEmails, logoUrl,
            discount: parseNum(discount),
            finalPrice: parseNum(finalPrice),
            tax: parseNum(tax),
            invoiceNumber,
            maxBranches: parseNum(maxBranches),
            maxStaffUsers: parseNum(maxStaffUsers),
            maxStudents: parseNum(maxStudents),
            maxParents: parseNum(maxParents),
            maxTeachers: parseNum(maxTeachers),
            maxStorage,
            maxFileSize,
            maxSmsCredits: parseNum(maxSmsCredits),
            maxWhatsappMsgs: parseNum(maxWhatsappMsgs)
        });

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        res.status(200).json({ status: 'success', message: 'Tenant updated successfully', data: { logoUrl } });
    } catch (error) {
        console.error('Error updating tenant:', error);
        if (error.message === 'Tenant slug already exists') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getTenants,
    getTenantById,
    createTenant,
    updateTenantStatus,
    updateTenant
};
