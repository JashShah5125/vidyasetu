const express = require('express');
const router = express.Router({ mergeParams: true });
const appParentFeeController = require('../controllers/appParentFeeController');
const { requirePermission } = require('../../middleware/authMiddleware');

/**
 * @route   GET /api/app/parent/children/:studentId/fees/summary
 * @desc    Outstanding balance, next due date, gross fee, and paid summary
 * @access  Private (Parent)
 */
router.get('/summary', requirePermission('parent.fee.view'), (req, res) => appParentFeeController.getFeeSummary(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/fees/invoices
 * @desc    Installment breakdown heads (Tuition, Activity, Library fee), payment status, and historical receipts [Paginated]
 * @access  Private (Parent)
 */
router.get('/invoices', requirePermission('parent.fee.view'), (req, res) => appParentFeeController.getInvoices(req, res));

module.exports = router;
