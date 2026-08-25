const pool = require('../config/db');
const tenantModel = require('../models/tenantModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendTenantWelcomeEmail } = require('./mailService');

const generateTemporaryPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(12);
    const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    return `VS-${suffix}`;
};

const createTenantWithAdmin = async (tenantData) => {
    const { 
        name, legal_name, slug, adminEmail, planId, address, city, state, pincode, panNo, 
        timezone, billingCycle, logoUrl, alternateEmails,
        discount, finalPrice, tax, invoiceNumber, maxBranches, maxStaffUsers, maxStudents, maxParents, 
        maxTeachers, maxStorage, maxFileSize, maxSmsCredits, maxWhatsappMsgs
    } = tenantData;
    const temporaryPassword = generateTemporaryPassword();
    
    // Check if slug exists
    const slugExists = await tenantModel.checkSlugExists(slug);
    if (slugExists) {
        throw new Error('Tenant slug already exists');
    }

    // Generate unique internal code
    const code = 'T-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Tenant (including profile and subscription)
        const [tenantResult] = await connection.query(
            `INSERT INTO tenants (
                name, slug, code, tenant_type, status, owner_name, primary_email, owner_mobile, plan_id, 
                subscription_status, address_line1, city, state, pincode, pan_number, timezone, billing_cycle, 
                logo_url, alternate_emails, subscription_discount, subscription_final_price, subscription_tax, 
                subscription_invoice_number, override_max_branches, override_max_staff_users, override_max_students, 
                override_max_parents, override_max_teachers, override_max_storage, override_max_file_size, 
                override_max_sms_credits, override_max_whatsapp_msgs
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, slug, code, 'customer', 'active', legal_name || name, adminEmail, '', planId || null, 
                'active', address || null, city || null, state || null, pincode || null, panNo || null, 
                timezone || 'Asia/Kolkata', billingCycle || 'annual', logoUrl || null, 
                alternateEmails ? JSON.stringify(alternateEmails) : null,
                discount !== undefined ? discount : null, 
                finalPrice !== undefined ? finalPrice : null, 
                tax !== undefined ? tax : null, 
                invoiceNumber || null, 
                maxBranches !== undefined ? maxBranches : null, 
                maxStaffUsers !== undefined ? maxStaffUsers : null, 
                maxStudents !== undefined ? maxStudents : null, 
                maxParents !== undefined ? maxParents : null, 
                maxTeachers !== undefined ? maxTeachers : null, 
                maxStorage || null, 
                maxFileSize || null, 
                maxSmsCredits !== undefined ? maxSmsCredits : null, 
                maxWhatsappMsgs !== undefined ? maxWhatsappMsgs : null
            ]
        );
        const tenantId = tenantResult.insertId;

        // 3. Create Admin User
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const [userResult] = await connection.query(
            'INSERT INTO users (tenant_id, name, email, password_hash, user_type, status, must_change_password, password_generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [tenantId, legal_name || 'Tenant Admin', adminEmail, passwordHash, 'staff', 'active', 1]
        );
        const adminUserId = userResult.insertId;

        // 4. Update primary admin on tenant
        await connection.query(
            'UPDATE tenants SET primary_admin_user_id = ? WHERE id = ?',
            [adminUserId, tenantId]
        );

        // 5. Assign Role (inst_admin)
        // Find role id for inst_admin in this tenant (we should copy roles from system, or just create it if missing, but we assume it exists if seeded properly, actually we seed roles per tenant, wait. The unique index allows it. Let's just create the role for now if it doesn't exist)
        let [roles] = await connection.query('SELECT id FROM roles WHERE code = ? AND tenant_id = ?', ['inst_admin', tenantId]);
        let roleId;
        if (roles.length === 0) {
            // Create role
            const [roleResult] = await connection.query(
                'INSERT INTO roles (tenant_id, name, code, description, is_system) VALUES (?, ?, ?, ?, ?)',
                [tenantId, 'Institute Admin', 'inst_admin', 'Full access to institute', 0]
            );
            roleId = roleResult.insertId;
        } else {
            roleId = roles[0].id;
        }

        // Assign user_role
        await connection.query(
            'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
            [adminUserId, roleId, tenantId]
        );

        // 6. Subscription is now handled in Step 1

        // 7. Audit Log
        await connection.query(
            'INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, ip_address) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
            [tenantId, adminUserId, 'CREATE', 'tenant', tenantId, '127.0.0.1'] // Placeholder IP
        );

        await connection.commit();
        let welcomeEmailSent = false;
        try {
            await sendTenantWelcomeEmail({
                recipientEmail: adminEmail,
                ownerName: legal_name || name,
                instituteName: name,
                temporaryPassword
            });
            welcomeEmailSent = true;
        } catch (emailError) {
            console.error('Tenant created but welcome email failed:', emailError.message);
        }

        return { tenantId, adminUserId, logoUrl, welcomeEmailSent };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getTenants = async (limit, offset, search, status, plan) => {
    return await tenantModel.getTenants(limit, offset, search, status, plan);
};

const getTenantById = async (id) => {
    return await tenantModel.getTenantById(id);
};

const updateTenantStatus = async (id, status) => {
    return await tenantModel.updateTenantStatus(id, status);
};

const updateTenant = async (id, tenantData) => {
    // If slug is being updated, verify it doesn't exist for a DIFFERENT tenant
    if (tenantData.slug) {
        const existingTenant = await tenantModel.getTenantById(id);
        if (existingTenant.slug !== tenantData.slug) {
            const slugExists = await tenantModel.checkSlugExists(tenantData.slug);
            if (slugExists) {
                throw new Error('Tenant slug already exists');
            }
        }
    }
    
    try {
        // Add audit log (optional but good practice)
        await pool.query(
            'INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, ip_address) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
            [id, null, 'UPDATE', 'tenant', id, '127.0.0.1']
        );
    } catch (auditError) {
        console.error('Audit log failed, proceeding anyway:', auditError.message);
    }

    return await tenantModel.updateTenant(id, tenantData);
};

module.exports = {
    createTenantWithAdmin,
    getTenants,
    getTenantById,
    updateTenantStatus,
    updateTenant
};
