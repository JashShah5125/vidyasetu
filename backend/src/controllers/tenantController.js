
const tenantService = require('../services/tenantService');
const userModel = require('../models/userModel');
const pool = require('../config/db');

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
            },
            filters: {
                statuses: result.available_statuses
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
            panNo, gstNo, mobile, timezone, billingCycle, alternate_emails, leadId,
            startDate, endDate, start_date, end_date, renewalDate, renewal_date,
            discount, finalPrice, tax, invoiceNumber, maxBranches, maxStaffUsers, maxStudents, maxParents,
            maxTeachers, maxStorage, maxFileSize, maxSmsCredits, maxWhatsappMsgs
        } = req.body;

        // Data Validation Regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;
        const slugRegex = /^[a-z0-9-]+$/;

        // Compulsory Fields Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ status: 'error', message: 'Institute / Coaching Name is compulsory' });
        }
        if (!slug || !slug.trim()) {
            return res.status(400).json({ status: 'error', message: 'Custom Subdomain Slug is compulsory' });
        }
        if (!slugRegex.test(slug.trim())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Slug can only contain lowercase letters, numbers, and hyphens' });
        }
        if (!address || !address.trim()) {
            return res.status(400).json({ status: 'error', message: 'Address Line 1 is compulsory' });
        }
        if (!city || !city.trim()) {
            return res.status(400).json({ status: 'error', message: 'City is compulsory' });
        }
        if (!state || !state.trim()) {
            return res.status(400).json({ status: 'error', message: 'State is compulsory' });
        }
        if (!pincode || !pincodeRegex.test(pincode.trim())) {
            return res.status(400).json({ status: 'error', message: 'PIN Code is compulsory and must be exactly 6 digits' });
        }
        if (!adminEmail || !emailRegex.test(adminEmail.trim())) {
            return res.status(400).json({ status: 'error', message: 'Admin Email is compulsory and must be a valid email address without invalid special characters' });
        }

        // Check if admin email already exists in users table (Bug 18 fix)
        const existingUser = await userModel.findUserByEmail(adminEmail.trim().toLowerCase());
        if (existingUser && existingUser.length > 0) {
            return res.status(409).json({ status: 'error', message: 'An account with this email address already exists. Please use a different Admin Email.' });
        }

        const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
        if (!cleanMobile || cleanMobile.length < 10) {
            return res.status(400).json({ status: 'error', message: 'Primary Mobile Number is compulsory and must be at least 10 digits' });
        }
        if (!planId) {
            return res.status(400).json({ status: 'error', message: 'Subscription Plan is compulsory' });
        }
        if (!billingCycle) {
            return res.status(400).json({ status: 'error', message: 'Billing Cycle is compulsory' });
        }

        // Optional Format Validations
        if (panNo && !panRegex.test(panNo.toUpperCase())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: PAN Number must be 10 alphanumeric characters (e.g., ABCDE1234F)' });
        }
        if (gstNo && !gstRegex.test(gstNo.toUpperCase())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: GSTIN is incorrectly formatted' });
        }

        let logoUrl = null;
        if (req.file) {
            logoUrl = `/uploads/tenants/logo/${req.file.filename}`;
        }

        let parsedAltEmails = null;
        if (alternate_emails) {
            try { parsedAltEmails = JSON.parse(alternate_emails); } catch (e) { }
        }

        const parseNum = (val) => (val === undefined ? undefined : (val === '' || val === 'null' || val === null || isNaN(Number(val)) ? null : Number(val)));
        const parseStr = (val) => (val === undefined ? undefined : (val === '' || val === 'null' || val === null ? null : String(val).trim()));

        const result = await tenantService.createTenantWithAdmin({
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, gstNo, mobile, timezone, billingCycle, logoUrl, alternateEmails: parsedAltEmails,
            startDate: parseStr(startDate || start_date),
            endDate: parseStr(endDate || end_date),
            renewalDate: parseStr(renewalDate || renewal_date),
            discount: parseNum(discount),
            finalPrice: parseNum(finalPrice),
            tax: parseNum(tax),
            invoiceNumber,
            maxBranches: parseNum(maxBranches),
            maxStaffUsers: parseNum(maxStaffUsers),
            maxStudents: parseNum(maxStudents),
            maxParents: parseNum(maxParents),
            maxTeachers: parseNum(maxTeachers),
            maxStorage: parseStr(maxStorage),
            maxFileSize: parseStr(maxFileSize),
            maxSmsCredits: parseNum(maxSmsCredits),
            maxWhatsappMsgs: parseNum(maxWhatsappMsgs)
        }, leadId ? Number(leadId) : null);

        const responseData = { ...result };
        if (process.env.NODE_ENV === 'production') {
            // Never leak the auto-generated password outside development.
            delete responseData.temporaryPassword;
        }

        res.status(201).json({ status: 'success', message: 'Tenant created successfully', data: responseData });
    } catch (error) {
        console.error('Error creating tenant:', error);
        if (error.statusCode === 409 || error.message === 'Tenant slug already exists' || error.message === 'Lead has already been converted' || (error.message && error.message.includes('already exists'))) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateTenantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = [0, 1, 2, 3, '0', '1', '2', '3', 'active', 'inactive', 'suspended', 'deactivated', 'draft', 'trialing', 'deleted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: 'error', message: 'Invalid status. Expected 0 (inactive), 1 (active), 2 (draft), or 3 (deleted)' });
        }

        const success = await tenantService.updateTenantStatus(id, status, req.user?.id, req.ip);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        res.status(200).json({ status: 'success', message: `Tenant status updated successfully` });
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
            startDate, endDate, start_date, end_date, renewalDate, renewal_date,
            discount, finalPrice, tax, invoiceNumber, maxBranches, maxStaffUsers, maxStudents, maxParents,
            maxTeachers, maxStorage, maxFileSize, maxSmsCredits, maxWhatsappMsgs, status
        } = req.body;

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;

        if (name !== undefined && !name.trim()) return res.status(400).json({ status: 'error', message: 'Institute Name cannot be empty' });
        if (address !== undefined && !address.trim()) return res.status(400).json({ status: 'error', message: 'Address Line 1 cannot be empty' });
        if (city !== undefined && !city.trim()) return res.status(400).json({ status: 'error', message: 'City cannot be empty' });
        if (state !== undefined && !state.trim()) return res.status(400).json({ status: 'error', message: 'State cannot be empty' });
        if (pincode !== undefined && (!pincode.trim() || !pincodeRegex.test(pincode.trim()))) return res.status(400).json({ status: 'error', message: 'PIN Code must be exactly 6 digits' });
        if (adminEmail && !emailRegex.test(adminEmail.trim())) return res.status(400).json({ status: 'error', message: 'Invalid format: Admin Email is incorrectly formatted or contains invalid special characters' });
        const cleanMobile = mobile ? mobile.replace(/[^0-9]/g, '') : '';
        if (mobile && cleanMobile.length < 10) return res.status(400).json({ status: 'error', message: 'Invalid format: Mobile Number must be at least 10 digits' });
        if (panNo && !panRegex.test(panNo.toUpperCase())) return res.status(400).json({ status: 'error', message: 'Invalid format: PAN Number must be 10 alphanumeric characters' });
        if (gstNo && !gstRegex.test(gstNo.toUpperCase())) return res.status(400).json({ status: 'error', message: 'Invalid format: GSTIN is incorrectly formatted' });

        let logoUrl;
        console.log("DEBUG: updateTenant req.file =", req.file, "req.body.logo =", req.body.logo, "req.body.removeLogo =", req.body.removeLogo);
        if (req.file) {
            logoUrl = `/uploads/tenants/logo/${req.file.filename}`;
        } else if (req.body.removeLogo === 'true') {
            logoUrl = null;
        }

        let parsedAltEmails;
        if (alternate_emails) {
            try { parsedAltEmails = JSON.parse(alternate_emails); } catch (e) { }
        }

        const parseNum = (val) => (val === undefined ? undefined : (val === '' || val === 'null' || val === null || isNaN(Number(val)) ? null : Number(val)));
        const parseStr = (val) => (val === undefined ? undefined : (val === '' || val === 'null' || val === null ? null : String(val).trim()));

        const success = await tenantService.updateTenant(id, {
            name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, gstNo, mobile, timezone, billingCycle, alternateEmails: parsedAltEmails, logoUrl,
            status: parseNum(status),
            startDate: parseStr(startDate || start_date),
            endDate: parseStr(endDate || end_date),
            renewalDate: parseStr(renewalDate || renewal_date),
            discount: parseNum(discount),
            finalPrice: parseNum(finalPrice),
            tax: parseNum(tax),
            invoiceNumber,
            maxBranches: parseNum(maxBranches),
            maxStaffUsers: parseNum(maxStaffUsers),
            maxStudents: parseNum(maxStudents),
            maxParents: parseNum(maxParents),
            maxTeachers: parseNum(maxTeachers),
            maxStorage: parseStr(maxStorage),
            maxFileSize: parseStr(maxFileSize),
            maxSmsCredits: parseNum(maxSmsCredits),
            maxWhatsappMsgs: parseNum(maxWhatsappMsgs)
        }, req.user?.id, req.ip);

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

const getTenantAuditLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT a.*, u.name AS user_name, u.email AS user_email
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.tenant_id = ?
             ORDER BY a.created_at DESC
             LIMIT 50`,
            [id]
        );
        res.status(200).json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error fetching tenant audit logs:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs' });
    }
};

const jwtUtil = require('../utils/jwt');
const redisClient = require('../config/redis');
const bcrypt = require('bcryptjs');

const impersonateTenant = async (req, res) => {
    try {
        if (!req.user || !req.user.isSaasAdmin || req.user.isImpersonated) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. Only an active SaaS Super Admin can initiate tenant impersonation.' });
        }

        const { id } = req.params;
        const tenant = await tenantService.getTenantById(id);
        if (!tenant) {
            return res.status(404).json({ status: 'error', message: 'Tenant not found' });
        }

        if (tenant.status === 3) {
            return res.status(400).json({ status: 'error', message: 'Cannot impersonate a deleted tenant' });
        }

        // Find primary admin user or first active user for this tenant
        let targetUser = null;
        if (tenant.primary_admin_user_id) {
            const [rows] = await pool.query(
                'SELECT * FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL',
                [tenant.primary_admin_user_id, id]
            );
            if (rows.length > 0) targetUser = rows[0];
        }

        if (!targetUser) {
            const [rows] = await pool.query(
                'SELECT * FROM users WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY (user_type = "inst_admin") DESC, (status = "active") DESC, id ASC LIMIT 1',
                [id]
            );
            if (rows.length > 0) targetUser = rows[0];
        }

        // Auto-provision primary admin if tenant has no user yet
        if (!targetUser) {
            const adminEmail = (tenant.primary_email && tenant.primary_email.trim()) || `owner@${tenant.slug || 'tenant' + id}.vidyasetu.com`;
            const adminName = tenant.owner_name || tenant.name || 'Institute Administrator';
            const ADMIN_ROLE_CODE = 'inst_admin';

            let [roles] = await pool.query('SELECT id, code FROM roles WHERE code = ?', [ADMIN_ROLE_CODE]);
            if (roles.length === 0) {
                await pool.query(
                    'INSERT IGNORE INTO roles (name, code, description, is_system) VALUES (?, ?, ?, ?)',
                    ['Institute Admin', ADMIN_ROLE_CODE, 'Full access to institute', 0]
                );
                [roles] = await pool.query('SELECT id, code FROM roles WHERE code = ?', [ADMIN_ROLE_CODE]);
            }
            const roleId = roles[0].id;
            const passwordHash = await bcrypt.hash('VidyaSetu@2026', 10);

            const [insertRes] = await pool.query(
                'INSERT INTO users (tenant_id, name, email, password_hash, user_type, status, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, adminName, adminEmail, passwordHash, 'inst_admin', 'active', 0]
            );
            const newUserId = insertRes.insertId;

            await pool.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [newUserId, roleId]);
            await pool.query('UPDATE tenants SET primary_admin_user_id = ? WHERE id = ?', [newUserId, id]);

            const [newRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
            targetUser = newRows[0];
        }

        const roleCodes = await userModel.getUserRoleCodes(targetUser.id);
        const ROLE_PRIORITY = ['inst_admin', 'branch_admin', 'counsellor', 'finance', 'teacher'];
        let effectiveUserType = targetUser.user_type || 'inst_admin';
        for (const role of ROLE_PRIORITY) {
            if (roleCodes.includes(role)) {
                effectiveUserType = role;
                break;
            }
        }

        const tokenPayload = {
            userId: targetUser.id,
            tenantId: Number(id),
            userType: effectiveUserType,
            isSaasAdmin: false,
            isImpersonated: true,
            impersonatedBy: req.user?.userId || req.user?.id
        };

        const token = jwtUtil.generateToken(tokenPayload);
        const refreshToken = jwtUtil.generateRefreshToken(tokenPayload);

        // Fetch branch info if assigned
        let branchInfo = null;
        const [branchRows] = await pool.query(`
            SELECT b.id, b.name, b.code
            FROM user_branch_access uba
            JOIN branches b ON uba.branch_id = b.id
            WHERE uba.user_id = ? AND uba.revoked_at IS NULL AND b.deleted_at IS NULL
            ORDER BY uba.is_primary DESC, uba.id DESC
            LIMIT 1
        `, [targetUser.id]);
        if (branchRows[0]) {
            branchInfo = branchRows[0];
        }

        // Cache in redis if ready
        try {
            if (redisClient && redisClient.isReady) {
                await redisClient.setEx(`session:${refreshToken}`, jwtUtil.REFRESH_TTL_SECONDS, targetUser.id.toString());
            }
        } catch (rErr) {
            console.warn('Redis cache failed for impersonation session:', rErr.message);
        }

        // Record Audit Log for security and compliance
        try {
            await pool.query(
                'INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    id,
                    req.user?.userId || req.user?.id,
                    'IMPERSONATION_STARTED',
                    'tenant',
                    id,
                    JSON.stringify({
                        impersonatedUser: targetUser.email,
                        impersonatedName: targetUser.name,
                        saasAdminUserId: req.user?.userId || req.user?.id
                    }),
                    req.ip || '127.0.0.1'
                ]
            );
        } catch (auditErr) {
            console.error('Failed to log impersonation start audit:', auditErr.message);
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully logged in as ${tenant.name}`,
            data: {
                token,
                refreshToken,
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    email: targetUser.email,
                    userType: effectiveUserType,
                    isSaasAdmin: false,
                    tenantId: Number(id),
                    tenantName: tenant.name,
                    branch: branchInfo ? branchInfo.name : '',
                    branchId: branchInfo ? branchInfo.id : null,
                    branchCode: branchInfo ? branchInfo.code : null,
                    isImpersonated: true
                }
            }
        });
    } catch (error) {
        console.error('Impersonate tenant error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to initiate tenant login session' });
    }
};

module.exports = {
    getTenants,
    getTenantById,
    getTenantAuditLogs,
    createTenant,
    updateTenantStatus,
    updateTenant,
    impersonateTenant
};
