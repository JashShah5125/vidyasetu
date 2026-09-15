const feeModel = require('../models/feeModel');
const bundleModel = require('../models/bundleModel');
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

const getProgramFeePlans = async (req, res) => {
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

        const { page = 1, limit = 10, courseId, programId, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await feeModel.listProgramFeePlans(tenantId, {
            programId,
            courseId,
            search,
            limit: Number(limit),
            offset
        }, accessContext);

        res.json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch program fee plans:');
    }
};

const getLevelSubjectFees = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { levelId } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH') {
            if (!accessContext.authorizedBranchId) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: No authorized branch assigned' });
            }
            const isLevelInBranch = await feeAccessService.verifyLevelInBranch(tenantId, levelId, accessContext.authorizedBranchId);
            if (!isLevelInBranch) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: This academic level is not assigned to your branch.' });
            }
        }

        const data = await feeModel.getLevelSubjectFees(tenantId, levelId, accessContext);

        res.json({
            status: 'success',
            data,
            pagination: {
                total: data.length,
                page: 1,
                limit: data.length,
                totalPages: 1
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch subject fees:');
    }
};

const getBundles = async (req, res) => {
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

        const { page = 1, limit = 10, levelId, search = '', status = 'all' } = req.query;
        const offset = (page - 1) * limit;

        const result = await bundleModel.getBundles(tenantId, {
            levelId,
            branchId: accessContext.authorizedBranchId,
            search,
            status,
            limit: Number(limit),
            offset
        }, accessContext);

        res.json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch subject bundles:');
    }
};

const getBundleById = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const bundle = await bundleModel.getBundleById(tenantId, id);
        if (!bundle) {
            return res.status(404).json({ status: 'error', message: 'Subject bundle not found' });
        }

        if (accessContext.scope === 'BRANCH' && Number(bundle.branch_id) !== Number(accessContext.authorizedBranchId)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You cannot view bundles outside your authorized branch.' });
        }

        res.json({ status: 'success', data: bundle });
    } catch (error) {
        handleError(res, error, 'Error fetching branch bundle by id:');
    }
};

const getCollections = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        const { page = 1, limit = 10, search = '', batchId, bundleId, status, feeStatus } = req.query;
        const offset = (page - 1) * limit;

        const result = await studentModel.getStudents(tenantId, {
            page: Number(page),
            limit: Number(limit),
            offset,
            search,
            branchId: accessContext.authorizedBranchId,
            batchId,
            bundleId,
            status,
            feeStatus
        }, accessContext);

        res.json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        handleError(res, error, 'Error fetching branch fee collections:');
    }
};

const getStudentLedger = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { studentId } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const ledger = await paymentService.getStudentLedger(tenantId, Number(studentId), accessContext);
        res.json({ status: 'success', data: ledger });
    } catch (error) {
        handleError(res, error, 'Error fetching student ledger:');
    }
};

const getStudentFeeAssignment = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { studentId } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const assignment = await paymentService.getStudentFeeAssignment(tenantId, Number(studentId), accessContext);
        res.json({ status: 'success', data: assignment });
    } catch (error) {
        handleError(res, error, 'Error fetching student fee assignment:');
    }
};

const updateStudentFeeAssignment = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { studentId } = req.params;
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const result = await paymentService.updateStudentFeeAssignment(
            tenantId,
            Number(studentId),
            req.body,
            accessContext,
            userId
        );

        res.json({
            status: 'success',
            message: 'Student fee assignment updated successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error updating student fee assignment:');
    }
};

const createInvoice = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        // Branch check
        const studentId = Number(req.body.student_id);
        const ledger = await paymentService.getStudentLedger(tenantId, studentId, accessContext);
        if (!ledger) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }

        const result = await paymentService.createCollectionInvoice({
            tenantId,
            studentId,
            createdBy: Number(userId),
            amount: req.body.amount,
            paymentMode: req.body.payment_mode,
            transactionReference: req.body.transaction_reference || null,
            remarks: req.body.remarks || null,
            description: req.body.description || null,
            issueDate: req.body.issue_date || null,
            dueDate: req.body.due_date || null
        });

        res.status(201).json({
            status: 'success',
            message: 'Invoice created successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error creating branch collection invoice:');
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const invoice = await paymentService.getInvoiceById(tenantId, Number(id), accessContext);
        res.json({ status: 'success', data: invoice });
    } catch (error) {
        handleError(res, error, 'Error fetching branch invoice by id:');
    }
};

const updateInvoice = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const result = await paymentService.updateCollectionInvoice({
            tenantId,
            invoiceId: Number(id),
            amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
            paymentMode: req.body.payment_mode || req.body.paymentMode,
            transactionReference: req.body.transaction_reference !== undefined ? req.body.transaction_reference : req.body.transactionReference,
            description: req.body.description,
            remarks: req.body.remarks,
            issueDate: req.body.issue_date || req.body.issueDate,
            dueDate: req.body.due_date || req.body.dueDate,
            paymentDate: req.body.payment_date || req.body.paymentDate,
            accessContext,
            updatedBy: Number(userId)
        });

        res.json({ status: 'success', message: 'Invoice updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating branch invoice:');
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const userId = req.user?.userId || req.user?.id || 1;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        const result = await paymentService.deleteCollectionInvoice({
            tenantId,
            invoiceId: Number(id),
            accessContext,
            deletedBy: Number(userId)
        });

        res.json({ status: 'success', message: 'Invoice deleted successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error deleting branch invoice:');
    }
};

module.exports = {
    getProgramFeePlans,
    getLevelSubjectFees,
    getBundles,
    getBundleById,
    getCollections,
    getStudentLedger,
    getStudentFeeAssignment,
    updateStudentFeeAssignment,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById
};
