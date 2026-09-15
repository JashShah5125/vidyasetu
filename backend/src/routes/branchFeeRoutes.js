const express = require('express');
const router = express.Router();
const branchFeeController = require('../controllers/branchFeeController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Program-wise (full course) fee plans - branch scoped
router.get('/programs', requirePermission('fee.view'), branchFeeController.getProgramFeePlans);

// Subject-wise fees (level-mapped) - branch scoped
router.get('/levels/:levelId/subjects', requirePermission('fee.view'), branchFeeController.getLevelSubjectFees);

// Custom subject bundles - branch scoped
router.get('/bundles', requirePermission('fee.view'), branchFeeController.getBundles);
router.get('/bundles/:id', requirePermission('fee.view'), branchFeeController.getBundleById);

// Student Fee Collections Register (branch scoped)
router.get('/collections', requirePermission('fee.view'), branchFeeController.getCollections);

// Student Fee Assignment (read & update)
router.get('/students/:studentId/fee-assignment', requirePermission('fee.view'), branchFeeController.getStudentFeeAssignment);
router.put('/students/:studentId/fee-assignment', requirePermission('fee.update'), branchFeeController.updateStudentFeeAssignment);

// Student Ledger Details (branch scoped)
router.get('/students/:studentId/ledger', requirePermission('fee.view'), branchFeeController.getStudentLedger);

// Fee Collection / Invoices (branch scoped)
router.post('/invoices', requirePermission('fee.create'), branchFeeController.createInvoice);
router.get('/invoices/:id', requirePermission('fee.view'), branchFeeController.getInvoiceById);
router.put('/invoices/:id', requirePermission('fee.update'), branchFeeController.updateInvoice);
router.delete('/invoices/:id', requirePermission('fee.delete'), branchFeeController.deleteInvoice);

module.exports = router;
