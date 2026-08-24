const pool = require('../config/db');
const tenantModel = require('../models/tenantModel');
const bcrypt = require('bcryptjs');

const createTenantWithAdmin = async (tenantData) => {
    const { name, legal_name, slug, adminEmail, adminPassword, planId } = tenantData;
    
    // Check if slug exists
    const slugExists = await tenantModel.checkSlugExists(slug);
    if (slugExists) {
        throw new Error('Tenant slug already exists');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Tenant
        const [tenantResult] = await connection.query(
            'INSERT INTO tenants (name, slug, tenant_type, status) VALUES (?, ?, ?, ?)',
            [name, slug, 'customer', 'active']
        );
        const tenantId = tenantResult.insertId;

        // 2. Create Tenant Profile
        await connection.query(
            'INSERT INTO tenant_profiles (tenant_id, owner_name, owner_email, owner_mobile) VALUES (?, ?, ?, ?)',
            [tenantId, legal_name || name, adminEmail, '']
        );

        // 3. Create Admin User
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const [userResult] = await connection.query(
            'INSERT INTO users (tenant_id, name, email, password_hash, user_type, status) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, 'Tenant Admin', adminEmail, passwordHash, 'staff', 'active']
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

        // 6. Assign Subscription Plan
        if (planId) {
            await connection.query(
                'INSERT INTO tenant_subscriptions (tenant_id, plan_id, status) VALUES (?, ?, ?)',
                [tenantId, planId, 'active']
            );
        }

        // 7. Audit Log
        await connection.query(
            'INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, adminUserId, 'CREATE', 'tenant', tenantId, '127.0.0.1'] // Placeholder IP
        );

        await connection.commit();
        return { tenantId, adminUserId };
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

module.exports = {
    createTenantWithAdmin,
    getTenants,
    getTenantById,
    updateTenantStatus
};
