const pool = require('../config/db');

const getTenants = async (limit = 10, offset = 0, search = '', status = '', plan = '') => {
    let query = `
        SELECT t.*, t.owner_name as legal_name, t.primary_email as contact_email, t.owner_mobile as contact_phone,
               u.name as admin_name, u.email as admin_email,
               (SELECT COUNT(*) FROM branches b WHERE b.tenant_id = t.id) as branch_count,
               (SELECT COUNT(*) FROM users u2 WHERE u2.tenant_id = t.id) as user_count,
               sp.name as plan_name, t.plan_id as subscription_id,
               t.subscription_discount, t.subscription_final_price, t.subscription_tax, t.subscription_invoice_number,
               t.override_max_branches, t.override_max_staff_users, t.override_max_students, t.override_max_parents,
               t.override_max_teachers, t.override_max_storage, t.override_max_file_size, t.override_max_sms_credits, t.override_max_whatsapp_msgs
        FROM tenants t
        LEFT JOIN users u ON t.primary_admin_user_id = u.id
        LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
        WHERE t.tenant_type = 'customer' AND t.id != 1
    `;
    const params = [];

    if (search) {
        query += ` AND (t.name LIKE ? OR t.slug LIKE ? OR t.owner_name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
        query += ` AND t.status = ?`;
        params.push(status);
    }

    if (plan && plan !== 'All') {
        query += ` AND sp.name = ?`;
        params.push(plan);
    }

    query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
        SELECT COUNT(*) as total 
        FROM tenants t
        LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
        WHERE t.tenant_type = 'customer' AND t.id != 1
    `;
    const countParams = [];
    
    if (search) {
        countQuery += ` AND (t.name LIKE ? OR t.slug LIKE ? OR t.owner_name LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
        countQuery += ` AND t.status = ?`;
        countParams.push(status);
    }

    if (plan && plan !== 'All') {
        countQuery += ` AND sp.name = ?`;
        countParams.push(plan);
    }

    const [countRows] = await pool.query(countQuery, countParams);
    
    return {
        data: rows,
        total: countRows[0].total
    };
};

const getTenantById = async (id) => {
    const query = `
        SELECT t.*, t.owner_name as legal_name, t.primary_email as contact_email, t.owner_mobile as contact_phone, t.address_line1, t.city, t.state, t.country, t.pincode as postal_code,
               u.name as admin_name, u.email as admin_email,
               t.subscription_discount, t.subscription_final_price, t.subscription_tax, t.subscription_invoice_number,
               t.override_max_branches, t.override_max_staff_users, t.override_max_students, t.override_max_parents,
               t.override_max_teachers, t.override_max_storage, t.override_max_file_size, t.override_max_sms_credits, t.override_max_whatsapp_msgs
        FROM tenants t
        LEFT JOIN users u ON t.primary_admin_user_id = u.id
        WHERE t.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
};

const checkSlugExists = async (slug) => {
    const [rows] = await pool.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    return rows.length > 0;
};

const updateTenantStatus = async (id, status) => {
    const [result] = await pool.query('UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
};

const updateTenant = async (id, data) => {
    let query = 'UPDATE tenants SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    const fieldMap = {
        name: 'name',
        legal_name: 'owner_name',
        slug: 'slug',
        planId: 'plan_id',
        address: 'address_line1',
        city: 'city',
        state: 'state',
        pincode: 'pincode',
        panNo: 'pan_number',
        gstNo: 'gst_number',
        timezone: 'timezone',
        billingCycle: 'billing_cycle',
        alternateEmails: 'alternate_emails',
        discount: 'subscription_discount',
        finalPrice: 'subscription_final_price',
        tax: 'subscription_tax',
        invoiceNumber: 'subscription_invoice_number',
        maxBranches: 'override_max_branches',
        maxStaffUsers: 'override_max_staff_users',
        maxStudents: 'override_max_students',
        maxParents: 'override_max_parents',
        maxTeachers: 'override_max_teachers',
        maxStorage: 'override_max_storage',
        maxFileSize: 'override_max_file_size',
        maxSmsCredits: 'override_max_sms_credits',
        maxWhatsappMsgs: 'override_max_whatsapp_msgs'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            query += `, ${dbField} = ?`;
            if (key === 'alternateEmails' && data[key]) {
                params.push(JSON.stringify(data[key]));
            } else {
                params.push(data[key]);
            }
        }
    }

    if (data.logoUrl !== undefined) {
        query += `, logo_url = ?`;
        params.push(data.logoUrl);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await pool.query(query, params);
    
    // If adminEmail or owner_mobile is provided, update the primary contact info in tenants
    if (data.adminEmail || data.mobile) {
        let contactQuery = 'UPDATE tenants SET updated_at = CURRENT_TIMESTAMP';
        const contactParams = [];
        if (data.adminEmail !== undefined) {
            contactQuery += ', primary_email = ?';
            contactParams.push(data.adminEmail);
        }
        if (data.mobile !== undefined) {
            contactQuery += ', owner_mobile = ?';
            contactParams.push(data.mobile);
        }
        contactQuery += ' WHERE id = ?';
        contactParams.push(id);
        
        await pool.query(contactQuery, contactParams);
        
        // Also update primary user email/mobile if possible
        if (data.adminEmail) {
            await pool.query(
                'UPDATE users u JOIN tenants t ON u.id = t.primary_admin_user_id SET u.email = ?, u.updated_at = CURRENT_TIMESTAMP WHERE t.id = ?',
                [data.adminEmail, id]
            );
        }
    }

    if (data.legal_name !== undefined) {
        await pool.query(
            'UPDATE users u JOIN tenants t ON u.id = t.primary_admin_user_id SET u.name = ?, u.updated_at = CURRENT_TIMESTAMP WHERE t.id = ?',
            [data.legal_name, id]
        );
    }

    return result.affectedRows > 0;
};

module.exports = {
    getTenants,
    getTenantById,
    checkSlugExists,
    updateTenantStatus,
    updateTenant
};
