const express = require('express');
const router = express.Router();
const branchFinanceController = require('../controllers/branchFinanceController');
const otherIncomeController = require('../controllers/otherIncomeController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Branch-scoped Student Fee Collection list
router.get('/students', requirePermission('fee.view'), branchFinanceController.getStudents);

// Academic Options dropdown data (branch scoped)
router.get('/students/options/academic', requirePermission('fee.view'), branchFinanceController.getAcademicOptions);
router.get('/options/academic', requirePermission('fee.view'), branchFinanceController.getAcademicOptions);

// Student Ledger Details (branch scoped)
router.get('/students/:studentId/ledger', requirePermission('fee.view'), branchFinanceController.getStudentLedger);

// Collect Payment for a Student (creates invoice, updates fee assignment)
router.post('/students/:studentId/payments', requirePermission('fee.create'), branchFinanceController.collectPayment);
router.post('/payments', requirePermission('fee.create'), branchFinanceController.collectPayment);

// Manage Invoices (update & delete)
router.put('/invoices/:invoiceId', requirePermission('fee.update'), branchFinanceController.updateInvoice);
router.delete('/invoices/:invoiceId', requirePermission('fee.delete'), branchFinanceController.deleteInvoice);

// ── Branch Other Income (Non-student fee revenue) ──
router.get('/other-income', requirePermission(['other_income.view', 'fee.view', 'finance.view']), otherIncomeController.getOtherIncomes);
router.post('/other-income', requirePermission(['other_income.create', 'fee.create', 'finance.create']), otherIncomeController.createOtherIncome);
router.get('/other-income/:id', requirePermission(['other_income.view', 'fee.view', 'finance.view']), otherIncomeController.getOtherIncomeById);
router.put('/other-income/:id', requirePermission(['other_income.update', 'fee.update', 'finance.update']), otherIncomeController.updateOtherIncome);
router.delete('/other-income/:id', requirePermission(['other_income.delete', 'fee.delete', 'finance.delete']), otherIncomeController.deleteOtherIncome);

module.exports = router;
