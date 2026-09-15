const studentModel = require('../models/studentModel');
const paymentService = require('../services/paymentService');
const feeAccessService = require('../services/feeAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
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

module.exports = {
    getStudents,
    getStudentLedger,
    collectPayment,
    updateInvoice,
    deleteInvoice,
    getAcademicOptions
};
