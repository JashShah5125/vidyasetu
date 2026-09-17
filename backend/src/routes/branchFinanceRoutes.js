const express = require('express');
const router = express.Router();
const branchFinanceController = require('../controllers/branchFinanceController');
const otherIncomeController = require('../controllers/otherIncomeController');
const otherExpenseController = require('../controllers/otherExpenseController');
const staffSalaryController = require('../controllers/staffSalaryController');
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
router.get('/other-income', requirePermission(['other_income.view', 'fee.view', 'finance.view']), (req, res) => otherIncomeController.getOtherIncomes(req, res));
router.post('/other-income', requirePermission(['other_income.create', 'fee.create', 'finance.create']), (req, res) => otherIncomeController.createOtherIncome(req, res));
router.get('/other-income/:id', requirePermission(['other_income.view', 'fee.view', 'finance.view']), (req, res) => otherIncomeController.getOtherIncomeById(req, res));
router.put('/other-income/:id', requirePermission(['other_income.update', 'fee.update', 'finance.update']), (req, res) => otherIncomeController.updateOtherIncome(req, res));
router.delete('/other-income/:id', requirePermission(['other_income.delete', 'fee.delete', 'finance.delete']), (req, res) => otherIncomeController.deleteOtherIncome(req, res));

// ── Branch Other Expenses (Non-salary operational expenses) ──
router.get('/other-expenses', requirePermission(['expense.view', 'finance.view']), (req, res) => otherExpenseController.getOtherExpenses(req, res));
router.post('/other-expenses', requirePermission(['expense.create', 'finance.create']), (req, res) => otherExpenseController.createOtherExpense(req, res));
router.get('/other-expenses/:id', requirePermission(['expense.view', 'finance.view']), (req, res) => otherExpenseController.getOtherExpenseById(req, res));
router.put('/other-expenses/:id', requirePermission(['expense.update', 'finance.update']), (req, res) => otherExpenseController.updateOtherExpense(req, res));
router.delete('/other-expenses/:id', requirePermission(['expense.delete', 'finance.delete']), (req, res) => otherExpenseController.deleteOtherExpense(req, res));

// ── Branch Staff Salaries & Monthly Payroll Status ──
// Page 1: Staff Salary Structure Master list
router.get('/staff-salaries', requirePermission(['finance.view', 'fee.view']), (req, res) => staffSalaryController.getStaffSalaries(req, res));
// Page 1: Update Staff Basic Monthly Salary & Effective Date
router.put('/staff-salaries/:staffId', requirePermission(['finance.update', 'fee.update', 'finance.create', 'fee.create']), (req, res) => staffSalaryController.updateStaffSalary(req, res));
// Page 1: Reset / Clear Staff Basic Monthly Salary
router.delete('/staff-salaries/:staffId/salary', requirePermission(['finance.delete', 'fee.delete', 'finance.update']), (req, res) => staffSalaryController.resetStaffSalary(req, res));

// Page 2: Monthly Salary Status (PAID vs PENDING with KPI metrics)
router.get('/staff-salaries/status', requirePermission(['finance.view', 'fee.view']), (req, res) => staffSalaryController.getSalaryStatus(req, res));
// Action: Pay Staff Salary
router.post('/staff-salaries/:staffId/pay', requirePermission(['finance.create', 'fee.create']), (req, res) => staffSalaryController.paySalary(req, res));

// Page 3: Staff Salary Detail & Payment History
router.get('/staff-salaries/:staffId/history', requirePermission(['finance.view', 'fee.view']), (req, res) => staffSalaryController.getStaffSalaryHistory(req, res));

// Payment Record CRUD (Single Payment by ID)
router.get('/staff-salaries/payments/:paymentId', requirePermission(['finance.view', 'fee.view']), (req, res) => staffSalaryController.getSalaryPaymentById(req, res));
router.put('/staff-salaries/payments/:paymentId', requirePermission(['finance.update', 'fee.update', 'finance.create']), (req, res) => staffSalaryController.updateSalaryPayment(req, res));
router.delete('/staff-salaries/payments/:paymentId', requirePermission(['finance.delete', 'fee.delete', 'finance.update']), (req, res) => staffSalaryController.deleteSalaryPayment(req, res));

module.exports = router;

