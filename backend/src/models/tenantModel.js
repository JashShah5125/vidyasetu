const pool = require('../config/db');

const getTenants = async (limit = 10, offset = 0, search = '', status = '', plan = '') => {
    let query = `
        SELECT t.*, tp.legal_name, tp.contact_email, tp.contact_phone,
               u.name as admin_name, u.email as admin_email,
               (SELECT COUNT(*) FROM branches b WHERE b.tenant_id = t.id) as branch_count,
               (SELECT COUNT(*) FROM users u2 WHERE u2.tenant_id = t.id) as user_count,
               sp.name as plan_name, ts.id as subscription_id
        FROM tenants t
        LEFT JOIN tenant_profiles tp ON t.id = tp.tenant_id
        LEFT JOIN users u ON t.primary_admin_user_id = u.id
        LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
        LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE t.tenant_type = 'customer'
    `;
    const params = [];

    if (search) {
        query += ` AND (t.name LIKE ? OR t.slug LIKE ? OR tp.legal_name LIKE ?)`;
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
        LEFT JOIN tenant_profiles tp ON t.id = tp.tenant_id
        LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
        LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE t.tenant_type = 'customer'
    `;
    const countParams = [];
    
    if (search) {
        countQuery += ` AND (t.name LIKE ? OR t.slug LIKE ? OR tp.legal_name LIKE ?)`;
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
        SELECT t.*, tp.legal_name, tp.contact_email, tp.contact_phone, tp.address_line1, tp.city, tp.state, tp.country, tp.postal_code,
               u.name as admin_name, u.email as admin_email
        FROM tenants t
        LEFT JOIN tenant_profiles tp ON t.id = tp.tenant_id
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

module.exports = {
    getTenants,
    getTenantById,
    checkSlugExists,
    updateTenantStatus
};
