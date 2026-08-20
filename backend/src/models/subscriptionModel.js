const pool = require('../config/db');

const getSubscriptions = async (limit = 10, offset = 0, search = '', status = '') => {
    let query = `
        SELECT ts.*, t.name as tenant_name, sp.name as plan_name, sp.price_monthly, sp.price_annual
        FROM tenant_subscriptions ts
        JOIN tenants t ON ts.tenant_id = t.id
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (t.name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern);
    }

    if (status && status !== 'All') {
        query += ` AND ts.status = ?`;
        params.push(status.toLowerCase());
    }

    query += ` ORDER BY ts.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = `
        SELECT COUNT(*) as total 
        FROM tenant_subscriptions ts
        JOIN tenants t ON ts.tenant_id = t.id
        WHERE 1=1
    `;
    const countParams = [];

    if (search) {
        countQuery += ` AND (t.name LIKE ?)`;
        countParams.push(`%${search}%`);
    }
    
    if (status && status !== 'All') {
        countQuery += ` AND ts.status = ?`;
        countParams.push(status.toLowerCase());
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const getSubscriptionById = async (id) => {
    const query = `
        SELECT ts.*, t.name as tenant_name, sp.name as plan_name
        FROM tenant_subscriptions ts
        JOIN tenants t ON ts.tenant_id = t.id
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
};

const updateSubscriptionPlan = async (id, planId) => {
    const query = `
        UPDATE tenant_subscriptions
        SET plan_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [planId, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getSubscriptions,
    getSubscriptionById,
    updateSubscriptionPlan
};
