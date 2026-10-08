const pool = require('../config/db');
const studentModel = require('../models/studentModel');
const paymentService = require('../services/paymentService');
const feeAccessService = require('../services/feeAccessService');

const resolveTenantId = (req) => {
    if (req.user && (req.user.tenantId || req.user.tenant_id)) {
        const userTenantId = parseInt(req.user.tenantId || req.user.tenant_id);
        // Only SaaS super admins can explicitly view another tenant's metrics
        if ((req.user.isSaasAdmin || userTenantId === 1) && req.query && req.query.tenantId) {
            return parseInt(req.query.tenantId);
        }
        return userTenantId;
    }
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    return 2;
};

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
};

/**
 * GET /api/branch/finance/students
 * Returns students belonging strictly to the authenticated user's branch.
 */
const getStudents = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH' && !accessContext.authorizedBranchId) {
            return res.status(200).json({
                status: 'success',
                data: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
            });
        }

        const { page = 1, limit = 10, search = '', branchId, batchId, courseId, programId, levelId, academicYearId, status, feeStatus } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const result = await studentModel.getStudents(tenantId, {
            page: Number(page),
            limit: Number(limit),
            offset,
            search,
            branchId: accessContext.authorizedBranchId,
            batchId,
            courseId,
            programId,
            levelId,
            academicYearId,
            status,
            feeStatus
        }, accessContext);

        res.json({
            status: 'success',
            summary: result.summary || {
                totalExpected: 0,
                totalCollected: 0,
                totalRemaining: 0,
                totalOverdue: 0,
                defaulterCount: 0
            },
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch finance student list:');
    }
};

/**
 * GET /api/branch/finance/students/:studentId/ledger
 * Returns the student profile, fee assignment summary, and individual collection invoices.
 */
const getStudentLedger = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { studentId } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const ledger = await paymentService.getStudentLedger(tenantId, Number(studentId), accessContext);
        if (!ledger) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }

        const fa = ledger.feeAssignment;
        const responseData = {
            ...ledger,
            student: {
                id: ledger.id,
                name: ledger.full_name,
                studentCode: ledger.student_code,
                branchId: ledger.primary_branch_id,
                branchName: ledger.branch_name,
                batchId: ledger.batch_id,
                batchName: ledger.batch_name,
                academicYearId: ledger.academic_year_id,
                academicYearName: ledger.academic_year_name,
                mobile: ledger.mobile,
                email: ledger.email,
                status: ledger.student_status
            },
            feeAssignment: fa ? {
                ...fa,
                id: fa.id,
                grossAmount: Number(fa.gross_amount) || 0,
                gross_amount: Number(fa.gross_amount) || 0,
                concession: Number(fa.total_concession) || 0,
                totalConcession: Number(fa.total_concession) || 0,
                total_concession: Number(fa.total_concession) || 0,
                netAmount: Number(fa.net_amount) || 0,
                net_amount: Number(fa.net_amount) || 0,
                downPayment: Number(fa.down_payment) || 0,
                down_payment: Number(fa.down_payment) || 0,
                installmentCount: Number(fa.installment_count) || 1,
                installment_count: Number(fa.installment_count) || 1,
                installmentAmount: Number(fa.installment_amount) || 0,
                installment_amount: Number(fa.installment_amount) || 0,
                paidAmount: Number(fa.paid_amount) || 0,
                paid_amount: Number(fa.paid_amount) || 0,
                balanceAmount: Number(fa.balance_amount) || 0,
                balance_amount: Number(fa.balance_amount) || 0,
                status: fa.status
            } : null,
            invoices: (ledger.invoices || []).map(inv => ({
                ...inv,
                id: inv.id,
                invoiceNumber: inv.invoice_number,
                invoice_number: inv.invoice_number,
                amount: Number(inv.amount) || 0,
                paidAmount: Number(inv.paid_amount) || 0,
                paid_amount: Number(inv.paid_amount) || 0,
                balanceDue: Number(inv.balance_due) || 0,
                balance_due: Number(inv.balance_due) || 0,
                paymentMode: inv.payment_mode,
                payment_mode: inv.payment_mode,
                paymentDate: inv.payment_date || inv.issue_date,
                payment_date: inv.payment_date || inv.issue_date,
                transactionReference: inv.transaction_reference,
                transaction_reference: inv.transaction_reference,
                remarks: inv.remarks,
                status: inv.status
            }))
        };

        res.json({
            status: 'success',
            data: responseData
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch student ledger:');
    }
};

/**
 * POST /api/branch/finance/students/:studentId/payments
 * Collects a payment atomically:
 * - Locks student_fee_assignments row
 * - Creates a student_invoices record with amount = paid_amount, balance_due = 0.00, status = 'paid'
 * - Updates student_fee_assignments paid_amount and balance_amount
 */
const collectPayment = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const studentId = Number(req.params.studentId || req.body.studentId || req.body.student_id);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH' && !accessContext.authorizedBranchId) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: No authorized branch assigned' });
        }

        const {
            feeAssignmentId,
            fee_assignment_id,
            amount,
            paymentMode,
            payment_mode,
            transactionReference,
            transaction_reference,
            remarks
        } = req.body;

        const result = await paymentService.collectBranchPayment({
            tenantId,
            branchId: accessContext.authorizedBranchId,
            studentId,
            feeAssignmentId: feeAssignmentId || fee_assignment_id || null,
            amount,
            paymentMode: paymentMode || payment_mode,
            transactionReference: transactionReference || transaction_reference || null,
            remarks: remarks || null,
            createdBy: Number(userId)
        });

        res.status(201).json({
            status: 'success',
            message: 'Payment collected successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error collecting branch payment:');
    }
};

/**
 * GET /api/branch/finance/students/options/academic
 * Returns dropdown options (branches, academic years, batches, courses, etc.) scoped to the branch.
 */
const getAcademicOptions = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        const options = await studentModel.getAcademicOptions(tenantId, accessContext);
        res.json({ status: 'success', data: options });
    } catch (error) {
        handleError(res, error, 'Error fetching branch finance academic options:');
    }
};

/**
 * PUT /api/branch/finance/invoices/:invoiceId
 * Updates an invoice details and recalculates fee assignment balances atomically.
 */
const updateInvoice = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const invoiceId = Number(req.params.invoiceId || req.params.id);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const {
            amount,
            paymentMode,
            payment_mode,
            transactionReference,
            transaction_reference,
            description,
            remarks,
            issueDate,
            issue_date,
            dueDate,
            due_date,
            paymentDate,
            payment_date
        } = req.body;

        const result = await paymentService.updateCollectionInvoice({
            tenantId,
            invoiceId,
            amount: amount !== undefined ? Number(amount) : undefined,
            paymentMode: paymentMode || payment_mode,
            transactionReference: transactionReference !== undefined ? transactionReference : transaction_reference,
            description,
            remarks,
            issueDate: issueDate || issue_date,
            dueDate: dueDate || due_date,
            paymentDate: paymentDate || payment_date,
            accessContext,
            updatedBy: Number(userId)
        });

        res.json({
            status: 'success',
            message: 'Invoice updated successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error updating invoice:');
    }
};

/**
 * DELETE /api/branch/finance/invoices/:invoiceId
 * Deletes an invoice and readjusts student fee assignment balances atomically.
 */
const deleteInvoice = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const invoiceId = Number(req.params.invoiceId || req.params.id);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const result = await paymentService.deleteCollectionInvoice({
            tenantId,
            invoiceId,
            accessContext,
            deletedBy: Number(userId)
        });

        res.json({
            status: 'success',
            message: 'Invoice deleted successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error deleting invoice:');
    }
};

/**
 * GET /api/branch/finance/analytics
 * Executive finance analytics: Institute & Branch ARR, MRR, Collections, Payment Modes, and Comparisons.
 */
const getFinanceAnalytics = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        const requestedBranchId = req.query.branchId ? Number(req.query.branchId) : null;
        let branchId = requestedBranchId || accessContext.authorizedBranchId || null;

        // Fetch dynamic tenant name
        let instituteName = 'Institute Master';
        try {
            const [tRows] = await pool.query('SELECT name FROM tenants WHERE id = ? LIMIT 1', [tenantId]);
            if (tRows.length > 0 && tRows[0].name) {
                instituteName = tRows[0].name;
            }
        } catch {
            // fallback
        }

        // 1. Branch aggregations across all branches
        const [branchAgg] = await pool.query(`
            SELECT 
                b.id AS branch_id,
                b.name AS branch_name,
                COUNT(DISTINCT s.id) AS student_count,
                COALESCE(SUM(sfa.net_amount), 0) AS total_expected,
                COALESCE(SUM(sfa.paid_amount), 0) AS total_collected,
                COALESCE(SUM(sfa.balance_amount), 0) AS total_remaining
            FROM branches b
            LEFT JOIN students s ON s.primary_branch_id = b.id AND s.deleted_at IS NULL
            LEFT JOIN student_fee_assignments sfa ON sfa.student_id = s.id AND sfa.tenant_id = ?
            WHERE b.tenant_id = ? AND b.deleted_at IS NULL
            GROUP BY b.id, b.name
            ORDER BY total_expected DESC
        `, [tenantId, tenantId]);

        // If branchId is not yet resolved, use the first branch of this tenant
        if (!branchId && branchAgg.length > 0) {
            branchId = branchAgg[0].branch_id;
        }
        branchId = branchId || 1;

        // 2. Overdue calculation
        const [overdueRows] = await pool.query(`
            SELECT 
                s.primary_branch_id AS branch_id,
                sfa.net_amount, sfa.paid_amount, sfa.down_payment,
                sfa.installment_count, sfa.installment_amount,
                COALESCE(se.enrolled_date, sfa.created_at, s.created_at) AS start_date
            FROM student_fee_assignments sfa
            JOIN students s ON s.id = sfa.student_id
            LEFT JOIN student_enrollments se ON se.id = sfa.enrollment_id AND se.deleted_at IS NULL
            WHERE sfa.tenant_id = ? AND s.deleted_at IS NULL
        `, [tenantId]);

        const now = new Date();
        const branchOverdueMap = {};
        let instOverdue = 0;
        let instDefaulters = 0;

        for (const r of overdueRows) {
            const net = Number(r.net_amount) || 0;
            const paid = Number(r.paid_amount) || 0;
            const down = Number(r.down_payment) || 0;
            const instCount = Math.max(1, Number(r.installment_count) || 1);
            const instAmount = Number(r.installment_amount) || 0;
            const startDate = new Date(r.start_date || now);

            let expectedDue = down;
            for (let i = 1; i <= instCount; i++) {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + i);
                if (dueDate <= now) expectedDue += instAmount;
            }
            expectedDue = Math.min(net, expectedDue);
            const overdue = Math.max(0, expectedDue - paid);
            if (overdue > 0) {
                instOverdue += overdue;
                instDefaulters += 1;
                if (!branchOverdueMap[r.branch_id]) {
                    branchOverdueMap[r.branch_id] = { overdue: 0, defaulters: 0 };
                }
                branchOverdueMap[r.branch_id].overdue += overdue;
                branchOverdueMap[r.branch_id].defaulters += 1;
            }
        }

        // 3. Payment modes
        const [pmRows] = await pool.query(`
            SELECT 
                COALESCE(NULLIF(payment_mode, ''), 'Other') AS mode,
                COUNT(*) AS count,
                SUM(paid_amount) AS total_amount
            FROM student_invoices
            WHERE tenant_id = ? AND status = 'paid'
            GROUP BY mode
            ORDER BY total_amount DESC
        `, [tenantId]);

        // 4. Period Fee Collections (Today, Week, Month)
        const [periodFees] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(COALESCE(si.payment_date, si.created_at)) = CURDATE() THEN si.paid_amount ELSE 0 END), 0) AS today_inst,
                COALESCE(SUM(CASE WHEN YEARWEEK(COALESCE(si.payment_date, si.created_at), 1) = YEARWEEK(CURDATE(), 1) THEN si.paid_amount ELSE 0 END), 0) AS week_inst,
                COALESCE(SUM(CASE WHEN YEAR(COALESCE(si.payment_date, si.created_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(si.payment_date, si.created_at)) = MONTH(CURDATE()) THEN si.paid_amount ELSE 0 END), 0) AS month_inst,
                COALESCE(SUM(CASE WHEN s.primary_branch_id = ? AND DATE(COALESCE(si.payment_date, si.created_at)) = CURDATE() THEN si.paid_amount ELSE 0 END), 0) AS today_branch,
                COALESCE(SUM(CASE WHEN s.primary_branch_id = ? AND YEARWEEK(COALESCE(si.payment_date, si.created_at), 1) = YEARWEEK(CURDATE(), 1) THEN si.paid_amount ELSE 0 END), 0) AS week_branch,
                COALESCE(SUM(CASE WHEN s.primary_branch_id = ? AND YEAR(COALESCE(si.payment_date, si.created_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(si.payment_date, si.created_at)) = MONTH(CURDATE()) THEN si.paid_amount ELSE 0 END), 0) AS month_branch
            FROM student_invoices si
            JOIN students s ON s.id = si.student_id
            WHERE si.tenant_id = ? AND si.status = 'paid'
        `, [branchId, branchId, branchId, tenantId]);

        // 5. Period Expenses (Today, Week, Month)
        const [periodExpenses] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(expense_date) = CURDATE() THEN amount ELSE 0 END), 0) AS today_inst_exp,
                COALESCE(SUM(CASE WHEN YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1) THEN amount ELSE 0 END), 0) AS week_inst_exp,
                COALESCE(SUM(CASE WHEN YEAR(expense_date) = YEAR(CURDATE()) AND MONTH(expense_date) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) AS month_inst_exp,
                COALESCE(SUM(CASE WHEN branch_id = ? AND DATE(expense_date) = CURDATE() THEN amount ELSE 0 END), 0) AS today_branch_exp,
                COALESCE(SUM(CASE WHEN branch_id = ? AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1) THEN amount ELSE 0 END), 0) AS week_branch_exp,
                COALESCE(SUM(CASE WHEN branch_id = ? AND YEAR(expense_date) = YEAR(CURDATE()) AND MONTH(expense_date) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) AS month_branch_exp
            FROM branch_other_expenses
            WHERE tenant_id = ? AND deleted_at IS NULL
        `, [branchId, branchId, branchId, tenantId]);

        // 6. Expense Trend (Trailing 4 months)
        const [expTrend] = await pool.query(`
            SELECT 
                DATE_FORMAT(expense_date, '%b') AS label,
                DATE_FORMAT(expense_date, '%Y') AS year,
                DATE_FORMAT(expense_date, '%Y-%m') AS ym,
                SUM(amount) AS amount
            FROM branch_other_expenses
            WHERE tenant_id = ? AND deleted_at IS NULL
              AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 4 MONTH)
            GROUP BY ym, label, year
            ORDER BY ym ASC
        `, [tenantId]);

        // Calculate Institute totals
        let instStudents = 0;
        let instExpected = 0;
        let instCollected = 0;
        let instRemaining = 0;

        const branchList = branchAgg.map(b => {
            const expected = Number(b.total_expected) || 0;
            const collected = Number(b.total_collected) || 0;
            const remaining = Number(b.total_remaining) || 0;
            const students = Number(b.student_count) || 0;
            instStudents += students;
            instExpected += expected;
            instCollected += collected;
            instRemaining += remaining;

            const bOverdue = branchOverdueMap[b.branch_id]?.overdue || 0;
            const bDefaulters = branchOverdueMap[b.branch_id]?.defaulters || 0;

            return {
                id: b.branch_id,
                name: b.branch_name,
                studentsCount: students,
                arr: expected,
                mrr: Math.round(expected / 12),
                totalExpected: expected,
                totalCollected: collected,
                totalRemaining: remaining,
                overdueAmount: bOverdue,
                defaulterCount: bDefaulters,
                realizationRate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0
            };
        });

        // Add contribution share
        branchList.forEach(b => {
            b.contributionPct = instExpected > 0 ? Math.round((b.arr / instExpected) * 1000) / 10 : 0;
        });

        const activeBranch = branchList.find(b => b.id === Number(branchId)) || branchList[0] || null;

        const institute = {
            name: instituteName,
            totalStudents: instStudents,
            arr: instExpected,
            mrr: Math.round(instExpected / 12),
            totalExpected: instExpected,
            totalCollected: instCollected,
            totalRemaining: instRemaining,
            overdueAmount: instOverdue,
            defaulterCount: instDefaulters,
            realizationRate: instExpected > 0 ? Math.round((instCollected / instExpected) * 1000) / 10 : 0
        };

        const totalPmAmount = pmRows.reduce((a, b) => a + Number(b.total_amount || 0), 0) || 1;
        const paymentModes = pmRows.map(p => ({
            mode: p.mode,
            count: Number(p.count) || 0,
            amount: Number(p.total_amount) || 0,
            percentage: Math.round((Number(p.total_amount || 0) / totalPmAmount) * 1000) / 10
        }));

        res.json({
            status: 'success',
            data: {
                institute,
                branch: activeBranch,
                branchesComparison: branchList,
                paymentModes,
                periodFees: periodFees[0] || {},
                periodExpenses: periodExpenses[0] || {},
                expenseTrend: expTrend || []
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching finance analytics:');
    }
};

module.exports = {
    getStudents,
    getStudentLedger,
    collectPayment,
    updateInvoice,
    deleteInvoice,
    getAcademicOptions,
    getFinanceAnalytics
};
