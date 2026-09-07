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
        LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
        WHERE i.deleted_at IS NULL
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
        WHERE i.deleted_at IS NULL
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
        WHERE deleted_at IS NULL
        ORDER BY yr DESC
    `);
    let availableYears = yearRows.map(r => Number(r.yr)).filter(y => y > 0);
    const currentYr = new Date().getFullYear();
    if (!availableYears.includes(currentYr)) {
        availableYears.unshift(currentYr);
    }
    availableYears.sort((a, b) => b - a);

    // 2. Build SQL filter clause for saas_invoices using effective invoice date
    let whereClause = `WHERE deleted_at IS NULL AND tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'customer' AND id != 1)`;
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
        LEFT JOIN saas_invoices i ON i.tenant_id = t.id AND i.status = 'paid' AND i.deleted_at IS NULL
        ${mrrWhere}
    `, mrrParams);

    const [[tenantMrr]] = await pool.query(`
        SELECT SUM(subscription_final_price) AS mrr
        FROM tenants
        WHERE tenant_type = 'customer' AND id != 1 AND status = 'active'
    `);

    // 5. Top 5 recent paid invoice receipts for selected period
    let paymentsWhere = `WHERE i.status = 'paid' AND i.deleted_at IS NULL AND t.tenant_type = 'customer' AND t.id != 1`;
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

    let where = `WHERE i.status = 'paid' AND i.deleted_at IS NULL AND t.tenant_type = 'customer' AND t.id != 1`;
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
        WHERE i.status = 'paid' AND i.deleted_at IS NULL AND t.tenant_type = 'customer' AND t.id != 1
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
    let where = `WHERE i.deleted_at IS NULL AND t.tenant_type = 'customer' AND t.id != 1`;
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

// ─── Invoice CRUD ────────────────────────────────────────────────────────────

const INVOICE_CYCLES = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'lifetime'];
const INVOICE_STATUSES = ['draft', 'unpaid', 'paid', 'overdue', 'refunded', 'cancelled'];

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Server-side authoritative amount computation — the client is never trusted
// for derived figures (discount_amount, subtotal, tax_amount, total_amount).
const computeAmounts = (data) => {
    const planAmount = Number(data.plan_amount) || 0;
    const setupFee = Number(data.setup_fee) || 0;
    const base = planAmount + setupFee;
    const discountPercent = Math.min(100, Math.max(0, Number(data.discount_percent) || 0));
    const discountAmount = round2(base * discountPercent / 100);
    const subtotal = round2(base - discountAmount);
    const taxRate = Number(data.tax_rate) || 0;
    const taxAmount = round2(subtotal * taxRate / 100);
    const totalAmount = round2(subtotal + taxAmount);
    return { discountAmount, subtotal, taxAmount, totalAmount };
};

const generateInvoiceNumber = async (dateStr) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const [rows] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM saas_invoices WHERE invoice_number LIKE ?',
        [`${prefix}%`]
    );
    let seq = (Number(rows[0].cnt) || 0) + 1;
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
        const [exists] = await pool.query('SELECT id FROM saas_invoices WHERE invoice_number = ?', [candidate]);
        if (exists.length === 0) return candidate;
        seq += 1;
    }
    return `${prefix}${Date.now()}`;
};

const validateInvoiceData = async (data) => {
    const {
        tenant_id, plan_id, billing_cycle,
        billing_period_start, billing_period_end,
        plan_amount, setup_fee = 0, discount_percent = 0, tax_rate = 18,
        payment_date = null, status = 'draft'
    } = data;

    if (!tenant_id) throw httpError(400, 'Tenant is required');
    if (!plan_id) throw httpError(400, 'Subscription plan is required');
    if (!billing_cycle || !INVOICE_CYCLES.includes(billing_cycle)) {
        throw httpError(400, `Invalid billing cycle. Expected one of: ${INVOICE_CYCLES.join(', ')}`);
    }
    if (!billing_period_start || !billing_period_end) {
        throw httpError(400, 'Billing period start and end dates are required');
    }
    if (new Date(billing_period_end) < new Date(billing_period_start)) {
        throw httpError(400, 'Billing period end must be on or after the start date');
    }
    if (status && !INVOICE_STATUSES.includes(status)) {
        throw httpError(400, `Invalid invoice status. Expected one of: ${INVOICE_STATUSES.join(', ')}`);
    }
    if (['paid', 'refunded'].includes(status) && !payment_date) {
        throw httpError(400, 'Payment date is required when status is paid or refunded');
    }
    if (Number(plan_amount) < 0 || Number(setup_fee) < 0 || Number(discount_percent) < 0 || Number(tax_rate) < 0) {
        throw httpError(400, 'Amounts and rates cannot be negative');
    }

    const [tenants] = await pool.query('SELECT id FROM tenants WHERE id = ?', [tenant_id]);
    if (tenants.length === 0) throw httpError(404, 'Tenant not found');

    const [plans] = await pool.query('SELECT id FROM subscription_plans WHERE id = ?', [plan_id]);
    if (plans.length === 0) throw httpError(404, 'Subscription plan not found');
};

const getInvoiceById = async (id) => {
    const [rows] = await pool.query(
        `SELECT i.*, t.name AS tenant_name, sp.name AS plan_name
         FROM saas_invoices i
         JOIN tenants t ON i.tenant_id = t.id
         LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
         WHERE i.id = ? AND i.deleted_at IS NULL`,
        [id]
    );
    return rows[0] || null;
};

const createInvoice = async (data, userId = 1) => {
    await validateInvoiceData(data);

    let invoiceNumber = data.invoice_number ? String(data.invoice_number).trim() : null;
    if (invoiceNumber) {
        const [exists] = await pool.query('SELECT id FROM saas_invoices WHERE invoice_number = ?', [invoiceNumber]);
        if (exists.length > 0) throw httpError(409, `Invoice number "${invoiceNumber}" already exists`);
    } else {
        invoiceNumber = await generateInvoiceNumber(data.billing_period_start);
    }

    const { discountAmount, subtotal, taxAmount, totalAmount } = computeAmounts(data);

    const [result] = await pool.query(
        `INSERT INTO saas_invoices (
            invoice_number, tenant_id, plan_id, billing_cycle,
            billing_period_start, billing_period_end,
            plan_amount, setup_fee, discount_percent, discount_amount, subtotal,
            tax_rate, tax_amount, total_amount, currency,
            payment_date, payment_method, provider_transaction_id, payment_reference, status,
            notes, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            invoiceNumber, data.tenant_id, data.plan_id, data.billing_cycle,
            data.billing_period_start, data.billing_period_end,
            Number(data.plan_amount) || 0, Number(data.setup_fee) || 0, Number(data.discount_percent) || 0,
            discountAmount, subtotal,
            Number(data.tax_rate) || 0, taxAmount, totalAmount, data.currency || 'INR',
            data.payment_date || null, data.payment_method || null, data.provider_transaction_id || null,
            data.payment_reference || null, data.status || 'draft', data.notes || null, userId
        ]
    );

    return getInvoiceById(result.insertId);
};

const updateInvoice = async (id, data, userId = 1) => {
    const [existingRows] = await pool.query(
        'SELECT id, invoice_number FROM saas_invoices WHERE id = ? AND deleted_at IS NULL',
        [id]
    );
    if (existingRows.length === 0) throw httpError(404, 'Invoice not found');

    await validateInvoiceData(data);

    let invoiceNumber = data.invoice_number ? String(data.invoice_number).trim() : existingRows[0].invoice_number;
    if (invoiceNumber !== existingRows[0].invoice_number) {
        const [exists] = await pool.query(
            'SELECT id FROM saas_invoices WHERE invoice_number = ? AND id != ?',
            [invoiceNumber, id]
        );
        if (exists.length > 0) throw httpError(409, `Invoice number "${invoiceNumber}" already exists`);
    }

    const { discountAmount, subtotal, taxAmount, totalAmount } = computeAmounts(data);

    await pool.query(
        `UPDATE saas_invoices SET
            invoice_number = ?, tenant_id = ?, plan_id = ?, billing_cycle = ?,
            billing_period_start = ?, billing_period_end = ?,
            plan_amount = ?, setup_fee = ?, discount_percent = ?, discount_amount = ?, subtotal = ?,
            tax_rate = ?, tax_amount = ?, total_amount = ?, currency = ?,
            payment_date = ?, payment_method = ?, provider_transaction_id = ?, payment_reference = ?,
            status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND deleted_at IS NULL`,
        [
            invoiceNumber, data.tenant_id, data.plan_id, data.billing_cycle,
            data.billing_period_start, data.billing_period_end,
            Number(data.plan_amount) || 0, Number(data.setup_fee) || 0, Number(data.discount_percent) || 0,
            discountAmount, subtotal,
            Number(data.tax_rate) || 0, taxAmount, totalAmount, data.currency || 'INR',
            data.payment_date || null, data.payment_method || null, data.provider_transaction_id || null,
            data.payment_reference || null, data.status || 'draft', data.notes || null,
            id
        ]
    );

    return getInvoiceById(id);
};

const deleteInvoice = async (id) => {
    const [result] = await pool.query(
        'UPDATE saas_invoices SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
        [id]
    );
    if (result.affectedRows === 0) throw httpError(404, 'Invoice not found');
    return { id: Number(id) };
};

module.exports = {
    getInvoices,
    getBillingSummary,
    getRevenueTrend,
    getRevenueByMethod,
    getRevenueByPlan,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice
};
