const express = require('express');
const router = express.Router();
const appFeeController = require('../controllers/appFeeController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');

// All fee routes require Student Authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/fees/summary
 * @desc    Get overall fee status (Total Fee, Total Paid, Balance Due, Next Due Date)
 * @access  Private (Student)
 */
router.get('/summary', requirePermission('student.fee.view'), (req, res) => appFeeController.getSummary(req, res));

/**
 * @route   GET /api/app/fees/invoices
 * @desc    List of installment invoices (paid & pending) [Paginated]
 * @access  Private (Student)
 */
router.get('/invoices', requirePermission('student.fee.view'), (req, res) => appFeeController.getInvoices(req, res));

module.exports = router;
