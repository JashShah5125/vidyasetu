const paymentService = require('../services/paymentService');

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
};

const getStudentLedger = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const ledger = await paymentService.getStudentLedger(Number(tenantId), Number(req.params.id));
        res.status(200).json({ status: 'success', data: ledger });
    } catch (error) {
        handleError(res, error, 'Error fetching student ledger:');
    }
};

const recordPayment = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const result = await paymentService.recordPayment({
            tenantId: Number(tenantId),
            studentId: Number(req.body.student_id),
            enrollmentId: req.body.enrollment_id ? Number(req.body.enrollment_id) : undefined,
            branchId: req.body.branch_id ? Number(req.body.branch_id) : undefined,
            createdBy: Number(userId),
            amount: req.body.amount,
            paymentMode: req.body.payment_mode,
            transactionReference: req.body.transaction_reference || null,
            remarks: req.body.remarks || null,
            installmentIds: Array.isArray(req.body.installment_ids) ? req.body.installment_ids.map(id => Number(id)) : null
        });
        res.status(201).json({ status: 'success', message: 'Payment recorded successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error recording payment:');
    }
};

const createInvoice = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const result = await paymentService.createCollectionInvoice({
            tenantId: Number(tenantId),
            studentId: req.body.student_id,
            createdBy: Number(userId),
            amount: req.body.amount,
            paymentMode: req.body.payment_mode,
            transactionReference: req.body.transaction_reference || null,
            remarks: req.body.remarks || null,
            description: req.body.description || null,
            issueDate: req.body.issue_date || null,
            dueDate: req.body.due_date || null
        });
        res.status(201).json({ status: 'success', message: 'Invoice created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating invoice:');
    }
};

const getStudentFeeAssignment = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const assignment = await paymentService.getStudentFeeAssignment(Number(tenantId), Number(req.params.id));
        res.status(200).json({ status: 'success', data: assignment });
    } catch (error) {
        handleError(res, error, 'Error fetching student fee assignment:');
    }
};

const updateStudentFeeAssignment = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const result = await paymentService.updateStudentFeeAssignment(
            Number(tenantId),
            Number(req.params.id),
            req.body,
            null,
            Number(userId)
        );
        res.status(200).json({ status: 'success', message: 'Student fee assignment updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating student fee assignment:');
    }
};

const updateInvoice = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const invoiceId = Number(req.params.id);

        const result = await paymentService.updateCollectionInvoice({
            tenantId: Number(tenantId),
            invoiceId,
            amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
            paymentMode: req.body.payment_mode || req.body.paymentMode,
            transactionReference: req.body.transaction_reference !== undefined ? req.body.transaction_reference : req.body.transactionReference,
            description: req.body.description,
            remarks: req.body.remarks,
            issueDate: req.body.issue_date || req.body.issueDate,
            dueDate: req.body.due_date || req.body.dueDate,
            paymentDate: req.body.payment_date || req.body.paymentDate,
            accessContext: null,
            updatedBy: Number(userId)
        });

        res.status(200).json({ status: 'success', message: 'Invoice updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating invoice:');
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const invoiceId = Number(req.params.id);

        const result = await paymentService.deleteCollectionInvoice({
            tenantId: Number(tenantId),
            invoiceId,
            accessContext: null,
            deletedBy: Number(userId)
        });

        res.status(200).json({ status: 'success', message: 'Invoice deleted successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error deleting invoice:');
    }
};

module.exports = {
    getStudentLedger,
    getStudentFeeAssignment,
    updateStudentFeeAssignment,
    recordPayment,
    createInvoice,
    updateInvoice,
    deleteInvoice
};