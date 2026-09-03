const pool = require('../config/db');

// Builds a ">= startDate AND <= endDate" filter on the effective invoice date.
const buildDateRangeClause = (params, startDate, endDate) => {
    let clause = '';
    if (startDate) {
        clause += ` AND DATE(COALESCE(payment_date, billing_period_start, DATE(created_at))) >= DATE(?)`;
        params.push(startDate);
    }
    if (endDate) {
        clause += ` AND DATE(COALESCE(payment_date, billing_period_start, DATE(created_at))) <= DATE(?)`;
        params.push(endDate);
    }
    return clause;
};

// Shared helper to apply year + month + date-range filters on a saas_invoices WHERE query.
// prefix is the table alias ('' or 'i.') used by the calling query.
const buildInvoiceDateFilter = (alias, params, { year, month, startDate, endDate } = {}) => {
    const p = (field) => `${alias}${field}`;
    let clause = '';
    if (year && year !== 'all') {
        clause += ` AND YEAR(COALESCE(${p('payment_date')}, ${p('billing_period_start')}, DATE(${p('created_at')}))) = ?`;
        params.push(Number(year));
    }
    if (month && month !== 'all') {
        clause += ` AND MONTH(COALESCE(${p('payment_date')}, ${p('billing_period_start')}, DATE(${p('created_at')}))) = ?`;
        params.push(Number(month));
    }
    if (startDate) {
        clause += ` AND DATE(COALESCE(${p('payment_date')}, ${p('billing_period_start')}, DATE(${p('created_at')}))) >= DATE(?)`;
        params.push(startDate);
    }
    if (endDate) {
        clause += ` AND DATE(COALESCE(${p('payment_date')}, ${p('billing_period_start')}, DATE(${p('created_at')}))) <= DATE(?)`;
        params.push(endDate);
    }
    return clause;
};

const getInvoices = async (limit = 10, offset = 0, search = '', status = '', tenant = '', startDate = null, endDate = null) => {
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

    if (tenant && tenant !== 'All') {
        query += ` AND t.name = ?`;
        params.push(tenant);
    }

    if (status && status !== 'All') {
        query += ` AND i.status = ?`;
        params.push(status.toLowerCase());
    }

    if (startDate) {
        query += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) >= DATE(?)`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) <= DATE(?)`;
        params.push(endDate);
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

    if (tenant && tenant !== 'All') {
        countQuery += ` AND t.name = ?`;
        countParams.push(tenant);
    }
    
    if (status && status !== 'All') {
        countQuery += ` AND i.status = ?`;
        countParams.push(status.toLowerCase());
    }

    if (startDate) {
        countQuery += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) >= DATE(?)`;
        countParams.push(startDate);
    }

    if (endDate) {
        countQuery += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) <= DATE(?)`;
        countParams.push(endDate);
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const getBillingSummary = async (year = null, month = null, startDate = null, endDate = null) => {
    // 1. Get available years from DB dynamically for filter dropdowns
    const [yearRows] = await pool.query(`
        SELECT DISTINCT YEAR(COALESCE(payment_date, billing_period_start, DATE(created_at))) AS yr
        FROM saas_invoices
        ORDER BY yr DESC
    `);
    let availableYears = yearRows.map(r => Number(r.yr)).filter(y => y > 0);
    const currentYr = new Date().getFullYear();
    if (!availableYears.includes(currentYr)) {
        availableYears.unshift(currentYr);
    }
    availableYears.sort((a, b) => b - a);

    // 2. Build SQL filter clause for saas_invoices using effective invoice date
    let whereClause = `WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'customer' AND id != 1)`;
    const params = [];
    whereClause += buildInvoiceDateFilter('', params, { year, month, startDate, endDate });

    // 3. Lifetime/Period revenue aggregates
    const [[revRows]] = await pool.query(`
        SELECT
            SUM(total_amount)                                               AS total_invoiced,
            SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END)     AS collected_revenue,
            SUM(CASE WHEN status = 'paid' THEN subtotal ELSE 0 END)         AS net_revenue,
            SUM(CASE WHEN status = 'paid' THEN tax_amount ELSE 0 END)       AS total_tax,
            SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN total_amount ELSE 0 END) AS outstanding_revenue,
            SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END) AS refunded_revenue,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)                AS paid_count,
            SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN 1 ELSE 0 END) AS outstanding_count
        FROM saas_invoices
        ${whereClause}
    `, params);

    // 4. MRR computation for active subscriptions
    let mrrWhere = `WHERE t.tenant_type = 'customer' AND t.id != 1 AND t.status = 'active'`;
    const mrrParams = [];
    mrrWhere += buildInvoiceDateFilter('i.', mrrParams, { year, month, startDate, endDate });

    const [[mrrRows]] = await pool.query(`
        SELECT
            SUM(
                COALESCE(i.total_amount, t.subscription_final_price, 0) / CASE COALESCE(i.billing_cycle, 'monthly')
                    WHEN 'monthly'     THEN 1
                    WHEN 'quarterly'   THEN 3
                    WHEN 'half_yearly' THEN 6
                    WHEN 'yearly'      THEN 12
                    WHEN 'lifetime'    THEN 36
                    ELSE 1
                END
            ) AS mrr
        FROM tenants t
        LEFT JOIN saas_invoices i ON i.tenant_id = t.id AND i.status = 'paid'
        ${mrrWhere}
    `, mrrParams);

    const [[tenantMrr]] = await pool.query(`
        SELECT SUM(subscription_final_price) AS mrr
        FROM tenants
        WHERE tenant_type = 'customer' AND id != 1 AND status = 'active'
    `);

    // 5. Top 5 recent paid invoice receipts for selected period
    let paymentsWhere = `WHERE i.status = 'paid' AND t.tenant_type = 'customer' AND t.id != 1`;
    const paymentsParams = [];
    paymentsWhere += buildInvoiceDateFilter('i.', paymentsParams, { year, month, startDate, endDate });

    const [recentPayments] = await pool.query(`
        SELECT i.id, i.invoice_number, i.tenant_id, i.total_amount, i.payment_method, i.payment_reference,
               COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)) AS payment_date,
               i.status, t.name AS tenant_name, t.slug AS tenant_slug, sp.name AS plan_name
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
        ${paymentsWhere}
        ORDER BY COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)) DESC
        LIMIT 5
    `, paymentsParams);

    const rawMrr = Number(mrrRows?.mrr) || Number(tenantMrr?.mrr) || 0;
    const mrr = Math.round(rawMrr);
    const arr = Math.round(mrr * 12);
    const total_revenue = Math.round(Number(revRows.total_invoiced) || 0);
    const collected_revenue = Math.round(Number(revRows.collected_revenue) || 0);
    const outstanding_revenue = Math.round(Number(revRows.outstanding_revenue) || 0);

    return {
        mrr,
        arr,
        total_revenue,
        collected_revenue,
        outstanding: outstanding_revenue,
        net_revenue: Math.round(Number(revRows.net_revenue) || 0),
        total_tax: Math.round(Number(revRows.total_tax) || 0),
        refunded: Math.round(Number(revRows.refunded_revenue) || 0),
        paid_count: Number(revRows.paid_count) || 0,
        outstanding_count: Number(revRows.outstanding_count) || 0,
        available_years: availableYears,
        recent_payments: recentPayments
    };
};

// Monthly collected revenue trend (paid invoices) grouped by month.
// Filters: year (for the 12-month cumulative chart), plus optional startDate/endDate range.
const getRevenueTrend = async (year = null, startDate = null, endDate = null) => {
    const selectedYear = year && year !== 'all' ? Number(year) : new Date().getFullYear();

    let where = `WHERE i.status = 'paid' AND t.tenant_type = 'customer' AND t.id != 1`;
    const params = [];
    where += buildInvoiceDateFilter('i.', params, { year, startDate, endDate });

    const [rows] = await pool.query(`
        SELECT
            YEAR(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) AS yr,
            MONTH(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) AS mo,
            SUM(i.total_amount) AS rev
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        ${where}
        GROUP BY
            YEAR(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))),
            MONTH(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)))
    `, params);

    let baseTotal = 0;
    let monthTotals = Array(12).fill(0);
    rows.forEach(row => {
        const yr = Number(row.yr);
        const mo = Number(row.mo) - 1;
        const rev = Number(row.rev) || 0;
        if (yr < selectedYear) {
            baseTotal += rev;
        } else if (yr === selectedYear && mo >= 0 && mo < 12) {
            monthTotals[mo] += rev;
        }
    });

    let runningTotal = baseTotal;
    const trend = monthTotals.map((added, index) => {
        runningTotal += added;
        return {
            month: new Date(selectedYear, index, 1).toLocaleString('en-US', { month: 'short' }),
            raw: Math.round(runningTotal),
            added: Math.round(added),
            isCurrent: selectedYear === new Date().getFullYear() && index === new Date().getMonth()
        };
    });

    return { year: selectedYear, trend };
};

// Collected revenue split by payment method (paid invoices only).
const getRevenueByMethod = async () => {
    const [rows] = await pool.query(`
        SELECT
            i.payment_method AS method,
            COUNT(*) AS invoice_count,
            SUM(i.total_amount) AS revenue
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        WHERE i.status = 'paid' AND t.tenant_type = 'customer' AND t.id != 1
          AND i.payment_method IS NOT NULL AND i.payment_method != ''
        GROUP BY i.payment_method
        ORDER BY revenue DESC
    `);
    return rows.map(r => ({
        method: r.method,
        invoice_count: Number(r.invoice_count) || 0,
        revenue: Math.round(Number(r.revenue) || 0)
    }));
};

// Collected + outstanding revenue grouped by subscription plan.
const getRevenueByPlan = async (startDate = null, endDate = null) => {
    let where = `WHERE t.tenant_type = 'customer' AND t.id != 1`;
    const params = [];
    if (startDate) {
        where += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) >= DATE(?)`;
        params.push(startDate);
    }
    if (endDate) {
        where += ` AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) <= DATE(?)`;
        params.push(endDate);
    }

    const [rows] = await pool.query(`
        SELECT
            sp.name AS plan_name,
            COUNT(*) AS invoice_count,
            SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) AS collected,
            SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.total_amount ELSE 0 END) AS outstanding
        FROM saas_invoices i
        JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
        ${where}
        GROUP BY sp.name, i.plan_id
        ORDER BY collected DESC
    `, params);
    return rows.map(r => ({
        plan_name: r.plan_name || 'Unknown',
        invoice_count: Number(r.invoice_count) || 0,
        collected: Math.round(Number(r.collected) || 0),
        outstanding: Math.round(Number(r.outstanding) || 0)
    }));
};

module.exports = {
    getInvoices,
    getBillingSummary,
    getRevenueTrend,
    getRevenueByMethod,
    getRevenueByPlan
};
