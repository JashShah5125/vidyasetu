const pool = require('../config/db');

const getInvoices = async (limit = 10, offset = 0, search = '', status = '') => {
    let query = `
        SELECT i.*, t.name as tenant_name, sp.name as plan_name
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
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
    // Revenue figures sourced from the unified saas_invoices table only.

    // 1. Lifetime revenue aggregates from paid invoices
    const [[revRows]] = await pool.query(`
        SELECT
            SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END)     AS total_revenue,
            SUM(CASE WHEN status = 'paid' THEN subtotal ELSE 0 END)         AS net_revenue,
            SUM(CASE WHEN status = 'paid' THEN tax_amount ELSE 0 END)       AS total_tax,
            SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN total_amount ELSE 0 END) AS outstanding,
            SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END) AS refunded,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)                AS paid_count,
            SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN 1 ELSE 0 END) AS outstanding_count
        FROM saas_invoices
        WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'customer')
    `);

    // 2. MRR from the current active billing period.
    // Normalize each active tenant's current paid invoice total to monthly by billing_cycle.
    // lifetime is spread over 36 months as a standard amortization.
    const [[mrrRows]] = await pool.query(`
        SELECT
            SUM(
                i.total_amount / CASE i.billing_cycle
                    WHEN 'monthly'     THEN 1
                    WHEN 'quarterly'   THEN 3
                    WHEN 'half_yearly' THEN 6
                    WHEN 'yearly'      THEN 12
                    WHEN 'lifetime'    THEN 36
                    ELSE 1
                END
            ) AS mrr
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        WHERE t.tenant_type = 'customer'
          AND t.subscription_status = 'active'
          AND i.status = 'paid'
          AND i.billing_period_start <= CURDATE()
          AND i.billing_period_end >= CURDATE()
    `);

    const total_revenue = Number(revRows.total_revenue) || 0;
    const mrr = Number(mrrRows.mrr) || 0;
    return {
        total_revenue,
        net_revenue: Number(revRows.net_revenue) || 0,
        total_tax: Number(revRows.total_tax) || 0,
        outstanding: Number(revRows.outstanding) || 0,
        refunded: Number(revRows.refunded) || 0,
        paid_count: Number(revRows.paid_count) || 0,
        outstanding_count: Number(revRows.outstanding_count) || 0,
        mrr,
        arr: mrr * 12,
        total_paid: total_revenue
    };
};

module.exports = {
    getInvoices,
    getBillingSummary
};
