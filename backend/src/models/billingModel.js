const pool = require('../config/db');

const getInvoices = async (limit = 10, offset = 0, search = '', status = '') => {
    let query = `
        SELECT i.*, t.name as tenant_name, sp.name as plan_name
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN tenant_subscriptions ts ON i.subscription_id = ts.id
        LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (t.name LIKE ? OR i.invoice_number LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
    }

    if (status && status !== 'All') {
        query += ` AND i.status = ?`;
        params.push(status.toLowerCase());
    }

    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = `
        SELECT COUNT(*) as total 
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        WHERE 1=1
    `;
    const countParams = [];

    if (search) {
        countQuery += ` AND (t.name LIKE ? OR i.invoice_number LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (status && status !== 'All') {
        countQuery += ` AND i.status = ?`;
        countParams.push(status.toLowerCase());
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const getBillingSummary = async () => {
    const query = `
        SELECT 
            SUM(CASE WHEN ts.status = 'active' AND ts.billing_cycle = 'monthly' THEN sp.price_monthly
                     WHEN ts.status = 'active' AND ts.billing_cycle = 'annual' THEN sp.price_annual / 12
                     ELSE 0 END) as mrr,
            SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.total_amount ELSE 0 END) as outstanding,
            SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as total_paid
        FROM tenants t
        LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
        LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
        LEFT JOIN saas_invoices i ON t.id = i.tenant_id
        WHERE t.tenant_type = 'customer'
    `;
    // This query is a rough approximation. For large datasets, this needs separation or pre-aggregation.
    const [rows] = await pool.query(query);
    const mrr = rows[0].mrr || 0;
    return {
        mrr: Number(mrr),
        arr: Number(mrr) * 12,
        outstanding: Number(rows[0].outstanding || 0),
        total_paid: Number(rows[0].total_paid || 0)
    };
};

module.exports = {
    getInvoices,
    getBillingSummary
};
