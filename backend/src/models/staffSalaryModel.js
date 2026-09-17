const pool = require('../config/db');

/**
 * Helper to build branch filtering conditions for staff_profiles
 */
const buildBranchFilter = (branchId, params) => {
    if (!branchId || branchId === 'All') return '';
    const numericBranchId = Number(branchId);
    params.push(JSON.stringify([numericBranchId]), numericBranchId, numericBranchId);
    return ` AND (
        JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON))
        OR JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]')) = ?
        OR EXISTS (SELECT 1 FROM user_branch_access uba WHERE uba.user_id = u.id AND uba.branch_id = ?)
    )`;
};

/**
 * 1. Get Master Staff Salary Structure list
 */
const getStaffSalariesMaster = async (tenantId, { branchId, search, employeeType, page = 1, limit = 50 }, accessContext = {}) => {
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : branchId;
    const params = [tenantId];
    
    let whereClause = ` WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL AND sp.status = 'active'`;
    whereClause += buildBranchFilter(effectiveBranchId, params);

    if (search) {
        whereClause += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ? OR sp.designation LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
    }

    if (employeeType && employeeType !== 'All') {
        whereClause += ` AND sp.employee_type = ?`;
        params.push(employeeType);
    }

    const countQuery = `
        SELECT COUNT(DISTINCT sp.id) as total
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        ${whereClause}
    `;

    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const dataParams = [...params, parseInt(limit, 10), offset];

    const dataQuery = `
        SELECT 
            sp.id,
            sp.tenant_id,
            sp.user_id,
            sp.employee_id,
            sp.first_name,
            sp.last_name,
            CONCAT(sp.first_name, ' ', sp.last_name) AS full_name,
            sp.employee_type,
            sp.designation,
            sp.department,
            sp.contact_number,
            u.email,
            sp.joining_date,
            sp.salary_type,
            COALESCE(sp.salary_amount, 0) AS salary_amount,
            sp.salary_effective_from,
            COALESCE(b.name, 'Main Branch') AS primary_branch_name,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]')), 1) AS primary_branch_id
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        ${whereClause}
        ORDER BY sp.first_name ASC, sp.last_name ASC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, dataParams);

    return {
        data: rows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
    };
};

/**
 * 2. Update Basic Salary & Effective Date for a staff profile
 */
const updateStaffSalaryMaster = async (tenantId, staffId, { salaryAmount, salaryType = 'Monthly', salaryEffectiveFrom }, updaterUserId, accessContext = {}) => {
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : null;
    const params = [tenantId, Number(staffId)];

    let checkSql = `SELECT sp.id, sp.branch_ids, sp.user_id FROM staff_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.tenant_id = ? AND sp.id = ? AND sp.deleted_at IS NULL`;
    if (effectiveBranchId) {
        checkSql += buildBranchFilter(effectiveBranchId, params);
    }

    const [existing] = await pool.query(checkSql, params);
    if (!existing || existing.length === 0) {
        const err = new Error('Staff profile not found or unauthorized for this branch.');
        err.statusCode = 404;
        throw err;
    }

    const [result] = await pool.query(
        `UPDATE staff_profiles 
         SET salary_amount = ?,
             salary_type = ?,
             salary_effective_from = ?,
             updated_by = ?,
             updated_at = NOW()
         WHERE tenant_id = ? AND id = ?`,
        [
            salaryAmount !== undefined && salaryAmount !== null ? Number(salaryAmount) : 0,
            salaryType || 'Monthly',
            salaryEffectiveFrom || null,
            updaterUserId || null,
            tenantId,
            Number(staffId)
        ]
    );

    return {
        success: true,
        staffId: Number(staffId),
        salaryAmount: Number(salaryAmount),
        salaryType,
        salaryEffectiveFrom
    };
};

/**
 * 3. Get Monthly Salary Status (PAID vs PENDING) with Summary Totals
 */
const getStaffSalaryStatus = async (tenantId, { month, year, status = 'All', employeeType = 'All', search = '', branchId, page = 1, limit = 50 }, accessContext = {}) => {
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : branchId;
    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);

    const baseParams = [targetMonth, targetYear, tenantId];
    let whereClause = ` WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL AND sp.status = 'active'`;
    whereClause += buildBranchFilter(effectiveBranchId, baseParams);

    if (search) {
        whereClause += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ? OR sp.designation LIKE ?)`;
        const s = `%${search}%`;
        baseParams.push(s, s, s, s, s);
    }

    if (employeeType && employeeType !== 'All') {
        whereClause += ` AND sp.employee_type = ?`;
        baseParams.push(employeeType);
    }

    // Dynamic LEFT JOIN query
    const baseQuery = `
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        LEFT JOIN staff_salary_payments p 
            ON p.staff_id = sp.id 
           AND p.salary_month = ? 
           AND p.salary_year = ? 
           AND p.tenant_id = sp.tenant_id
           AND p.deleted_at IS NULL
        ${whereClause}
    `;

    // 1. Calculate Summary aggregates across ALL matching staff (irrespective of status filter/pagination)
    const summarySql = `
        SELECT 
            COUNT(DISTINCT sp.id) as total_staff,
            COALESCE(SUM(sp.salary_amount), 0) as total_salary,
            COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN p.amount ELSE 0 END), 0) as total_paid_amount,
            COALESCE(SUM(CASE WHEN p.id IS NULL THEN COALESCE(sp.salary_amount, 0) ELSE 0 END), 0) as total_pending_amount,
            COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN sp.id END) as paid_count,
            COUNT(DISTINCT CASE WHEN p.id IS NULL THEN sp.id END) as pending_count
        ${baseQuery}
    `;

    const [summaryRows] = await pool.query(summarySql, baseParams);
    const summary = summaryRows[0] || {
        total_staff: 0,
        total_salary: 0,
        total_paid_amount: 0,
        total_pending_amount: 0,
        paid_count: 0,
        pending_count: 0
    };

    // 2. Add Status Filter if specified
    let statusCondition = '';
    if (status === 'PAID' || status === 'paid') {
        statusCondition = ` AND p.id IS NOT NULL`;
    } else if (status === 'PENDING' || status === 'pending') {
        statusCondition = ` AND p.id IS NULL`;
    }

    const dataParams = [...baseParams];
    const countSql = `
        SELECT COUNT(DISTINCT sp.id) as total
        ${baseQuery}
        ${statusCondition}
    `;
    const [filteredCountRows] = await pool.query(countSql, dataParams);
    const filteredTotal = filteredCountRows[0]?.total || 0;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    dataParams.push(parseInt(limit, 10), offset);

    const dataSql = `
        SELECT 
            sp.id as staff_id,
            sp.employee_id,
            sp.first_name,
            sp.last_name,
            CONCAT(sp.first_name, ' ', sp.last_name) as full_name,
            sp.employee_type,
            sp.designation,
            sp.department,
            sp.contact_number,
            u.email,
            COALESCE(sp.salary_amount, 0) as salary_amount,
            sp.salary_effective_from,
            COALESCE(b.name, 'Main Branch') as branch_name,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]')), 1) as branch_id,
            p.id as payment_id,
            p.amount as paid_amount,
            p.paid_date,
            p.payment_mode,
            p.reference,
            p.remarks,
            p.created_at as payment_recorded_at,
            IF(p.id IS NOT NULL, 'PAID', 'PENDING') as payment_status
        ${baseQuery}
        ${statusCondition}
        ORDER BY payment_status ASC, sp.first_name ASC, sp.last_name ASC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, dataParams);

    return {
        data: rows,
        summary: {
            totalSalary: Number(summary.total_salary),
            paidAmount: Number(summary.total_paid_amount),
            pendingAmount: Number(summary.total_pending_amount),
            totalStaff: Number(summary.total_staff),
            paidCount: Number(summary.paid_count),
            pendingCount: Number(summary.pending_count)
        },
        pagination: {
            total: filteredTotal,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: Math.ceil(filteredTotal / parseInt(limit, 10))
        },
        period: {
            month: targetMonth,
            year: targetYear
        }
    };
};

/**
 * 4. Record Staff Salary Payment (PENDING -> PAID)
 */
const payStaffSalary = async (tenantId, staffId, { salaryMonth, salaryYear, amount, paidDate, paymentMode = 'bank_transfer', reference = null, remarks = null, branchId = null }, creatorUserId, accessContext = {}) => {
    const sId = Number(staffId);
    const m = parseInt(salaryMonth, 10);
    const y = parseInt(salaryYear, 10);

    if (isNaN(m) || m < 1 || m > 12) {
        const err = new Error('Invalid salary month (must be between 1 and 12).');
        err.statusCode = 400;
        throw err;
    }
    if (isNaN(y) || y < 2000 || y > 2100) {
        const err = new Error('Invalid salary year.');
        err.statusCode = 400;
        throw err;
    }

    // 1. Fetch Staff Profile and resolve Branch
    const [staffRows] = await pool.query(
        `SELECT sp.id, sp.tenant_id, sp.branch_ids, sp.salary_amount, sp.first_name, sp.last_name, u.id as user_id 
         FROM staff_profiles sp 
         JOIN users u ON sp.user_id = u.id
         WHERE sp.tenant_id = ? AND sp.id = ? AND sp.deleted_at IS NULL AND sp.status = 'active'`,
        [tenantId, sId]
    );

    if (!staffRows || staffRows.length === 0) {
        const err = new Error('Active staff profile not found.');
        err.statusCode = 404;
        throw err;
    }

    const staff = staffRows[0];
    let resolvedBranchId = branchId ? Number(branchId) : null;
    if (!resolvedBranchId) {
        try {
            const parsedBranches = typeof staff.branch_ids === 'string' ? JSON.parse(staff.branch_ids) : staff.branch_ids;
            if (Array.isArray(parsedBranches) && parsedBranches.length > 0) {
                resolvedBranchId = Number(parsedBranches[0]);
            }
        } catch {
            resolvedBranchId = 1;
        }
    }
    if (!resolvedBranchId) resolvedBranchId = 1;

    // Check branch access permissions
    if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        if (Number(resolvedBranchId) !== Number(accessContext.authorizedBranchId)) {
            // Also check if staff is assigned to authorized branch
            let isAssigned = false;
            try {
                const parsed = typeof staff.branch_ids === 'string' ? JSON.parse(staff.branch_ids) : staff.branch_ids;
                if (Array.isArray(parsed) && parsed.map(Number).includes(Number(accessContext.authorizedBranchId))) {
                    isAssigned = true;
                    resolvedBranchId = Number(accessContext.authorizedBranchId);
                }
            } catch {}
            if (!isAssigned) {
                const err = new Error('Forbidden: You cannot pay salary to staff outside your authorized branch.');
                err.statusCode = 403;
                throw err;
            }
        }
    }

    const paymentAmount = amount !== undefined && amount !== null ? Number(amount) : Number(staff.salary_amount || 0);
    if (paymentAmount <= 0) {
        const err = new Error('Salary payment amount must be greater than zero.');
        err.statusCode = 400;
        throw err;
    }

    const pDate = paidDate || new Date().toISOString().split('T')[0];

    // Check if payment already recorded for this period
    const [existingPayment] = await pool.query(
        `SELECT id, amount, paid_date FROM staff_salary_payments 
         WHERE tenant_id = ? AND branch_id = ? AND staff_id = ? AND salary_month = ? AND salary_year = ? AND deleted_at IS NULL`,
        [tenantId, resolvedBranchId, sId, m, y]
    );

    if (existingPayment && existingPayment.length > 0) {
        const err = new Error(`Salary for ${m}/${y} has already been paid on ${existingPayment[0].paid_date} (Amount: ₹${existingPayment[0].amount}).`);
        err.statusCode = 409;
        throw err;
    }

    // Insert payment record
    const [insertResult] = await pool.query(
        `INSERT INTO staff_salary_payments (
            tenant_id, branch_id, staff_id, salary_month, salary_year,
            amount, paid_date, payment_mode, reference, remarks,
            created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tenantId,
            resolvedBranchId,
            sId,
            m,
            y,
            paymentAmount,
            pDate,
            paymentMode || 'bank_transfer',
            reference || null,
            remarks || null,
            creatorUserId || null
        ]
    );

    return {
        success: true,
        paymentId: insertResult.insertId,
        staffId: sId,
        staffName: `${staff.first_name} ${staff.last_name}`.trim(),
        salaryMonth: m,
        salaryYear: y,
        amount: paymentAmount,
        paidDate: pDate,
        paymentMode: paymentMode || 'bank_transfer',
        reference: reference || null
    };
};

/**
 * 5. Get Individual Staff Salary Details & Historical Payment Records
 */
const getStaffSalaryHistory = async (tenantId, staffId, accessContext = {}) => {
    const sId = Number(staffId);
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : null;
    const params = [tenantId, sId];

    let staffSql = `
        SELECT 
            sp.id,
            sp.employee_id,
            sp.first_name,
            sp.last_name,
            CONCAT(sp.first_name, ' ', sp.last_name) as full_name,
            sp.employee_type,
            sp.designation,
            sp.department,
            sp.contact_number,
            u.email,
            sp.joining_date,
            sp.salary_type,
            COALESCE(sp.salary_amount, 0) as current_salary,
            sp.salary_effective_from,
            COALESCE(b.name, 'Main Branch') as branch_name,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]')), 1) as branch_id
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        WHERE sp.tenant_id = ? AND sp.id = ? AND sp.deleted_at IS NULL
    `;

    if (effectiveBranchId) {
        staffSql += buildBranchFilter(effectiveBranchId, params);
    }

    const [staffRows] = await pool.query(staffSql, params);
    if (!staffRows || staffRows.length === 0) {
        const err = new Error('Staff profile not found or unauthorized for this branch.');
        err.statusCode = 404;
        throw err;
    }

    const staff = staffRows[0];

    // Fetch payments list
    const [payments] = await pool.query(
        `SELECT 
            p.id,
            p.salary_month,
            p.salary_year,
            p.amount,
            p.paid_date,
            p.payment_mode,
            p.reference,
            p.remarks,
            p.created_at,
            'PAID' as status
         FROM staff_salary_payments p
         WHERE p.tenant_id = ? AND p.staff_id = ? AND p.deleted_at IS NULL
         ORDER BY p.salary_year DESC, p.salary_month DESC, p.paid_date DESC`,
        [tenantId, sId]
    );

    // Compute aggregations
    const totalPaid = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const monthsPaid = payments.length;

    return {
        staff: {
            id: staff.id,
            employeeId: staff.employee_id,
            name: staff.full_name,
            firstName: staff.first_name,
            lastName: staff.last_name,
            employeeType: staff.employee_type,
            designation: staff.designation,
            department: staff.department,
            email: staff.email,
            contactNumber: staff.contact_number,
            joiningDate: staff.joining_date,
            salaryType: staff.salary_type,
            currentSalary: Number(staff.current_salary),
            salaryEffectiveFrom: staff.salary_effective_from,
            branchName: staff.branch_name,
            branchId: staff.branch_id
        },
        summary: {
            totalPaid,
            monthsPaid,
            lastPaymentDate: payments.length > 0 ? payments[0].paid_date : null
        },
        history: payments
    };
};

/**
 * 6. Get Single Salary Payment Record by Payment ID
 */
const getSalaryPaymentById = async (tenantId, paymentId, accessContext = {}) => {
    const pId = Number(paymentId);
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : null;

    let query = `
        SELECT 
            p.id,
            p.tenant_id,
            p.branch_id,
            p.staff_id,
            p.salary_month,
            p.salary_year,
            p.amount,
            p.paid_date,
            p.payment_mode,
            p.reference,
            p.remarks,
            p.created_at,
            p.updated_at,
            sp.first_name,
            sp.last_name,
            CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
            sp.employee_id,
            sp.employee_type,
            sp.designation,
            b.name as branch_name
        FROM staff_salary_payments p
        JOIN staff_profiles sp ON p.staff_id = sp.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE p.tenant_id = ? AND p.id = ? AND p.deleted_at IS NULL
    `;

    const params = [tenantId, pId];
    if (effectiveBranchId) {
        query += ` AND p.branch_id = ?`;
        params.push(Number(effectiveBranchId));
    }

    const [rows] = await pool.query(query, params);
    if (!rows || rows.length === 0) {
        const err = new Error('Salary payment record not found or unauthorized.');
        err.statusCode = 404;
        throw err;
    }

    return rows[0];
};

/**
 * 7. Update Staff Salary Payment Record (amount, paid_date, payment_mode, reference, remarks)
 */
const updateStaffSalaryPayment = async (tenantId, paymentId, { amount, paidDate, paymentMode, reference, remarks }, updaterUserId, accessContext = {}) => {
    const pId = Number(paymentId);
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : null;

    const existing = await getSalaryPaymentById(tenantId, pId, accessContext);

    const updateFields = [];
    const updateParams = [];

    if (amount !== undefined && amount !== null) {
        const numAmt = Number(amount);
        if (isNaN(numAmt) || numAmt <= 0) {
            const err = new Error('Payment amount must be greater than zero.');
            err.statusCode = 400;
            throw err;
        }
        updateFields.push('amount = ?');
        updateParams.push(numAmt);
    }

    if (paidDate !== undefined && paidDate !== null) {
        updateFields.push('paid_date = ?');
        updateParams.push(paidDate);
    }

    if (paymentMode !== undefined && paymentMode !== null) {
        updateFields.push('payment_mode = ?');
        updateParams.push(paymentMode);
    }

    if (reference !== undefined) {
        updateFields.push('reference = ?');
        updateParams.push(reference || null);
    }

    if (remarks !== undefined) {
        updateFields.push('remarks = ?');
        updateParams.push(remarks || null);
    }

    if (updateFields.length === 0) {
        return existing;
    }

    updateFields.push('updated_at = NOW()');

    let updateSql = `UPDATE staff_salary_payments SET ${updateFields.join(', ')} WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`;
    updateParams.push(tenantId, pId);

    if (effectiveBranchId) {
        updateSql += ` AND branch_id = ?`;
        updateParams.push(Number(effectiveBranchId));
    }

    await pool.query(updateSql, updateParams);

    return await getSalaryPaymentById(tenantId, pId, accessContext);
};

/**
 * 8. Soft Delete Staff Salary Payment Record (Reverts month back to PENDING)
 */
const deleteStaffSalaryPayment = async (tenantId, paymentId, deleterUserId, accessContext = {}) => {
    const pId = Number(paymentId);
    const effectiveBranchId = accessContext.scope === 'BRANCH' ? accessContext.authorizedBranchId : null;

    const existing = await getSalaryPaymentById(tenantId, pId, accessContext);

    let deleteSql = `UPDATE staff_salary_payments SET deleted_at = NOW() WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`;
    const deleteParams = [tenantId, pId];

    if (effectiveBranchId) {
        deleteSql += ` AND branch_id = ?`;
        deleteParams.push(Number(effectiveBranchId));
    }

    const [res] = await pool.query(deleteSql, deleteParams);
    if (res.affectedRows === 0) {
        const err = new Error('Failed to delete salary payment record.');
        err.statusCode = 500;
        throw err;
    }

    return {
        success: true,
        message: `Salary payment for ${existing.salary_month}/${existing.salary_year} has been deleted. Month is now PENDING.`,
        deletedPaymentId: pId,
        staffId: existing.staff_id,
        salaryMonth: existing.salary_month,
        salaryYear: existing.salary_year
    };
};

/**
 * 9. Reset / Clear Staff Salary Structure (Base Salary -> 0, Effective Date -> NULL)
 */
const resetStaffSalaryMaster = async (tenantId, staffId, updaterUserId, accessContext = {}) => {
    return await updateStaffSalaryMaster(
        tenantId,
        staffId,
        { salaryAmount: 0, salaryType: 'Monthly', salaryEffectiveFrom: null },
        updaterUserId,
        accessContext
    );
};

module.exports = {
    getStaffSalariesMaster,
    updateStaffSalaryMaster,
    resetStaffSalaryMaster,
    getStaffSalaryStatus,
    payStaffSalary,
    getStaffSalaryHistory,
    getSalaryPaymentById,
    updateStaffSalaryPayment,
    deleteStaffSalaryPayment
};
