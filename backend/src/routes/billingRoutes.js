const express = require('express');
const router = express.Router();

const billingController = require('../controllers/billingController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/invoices', requirePermission('billing.view'), billingController.getInvoices);
router.get('/summary', requirePermission('billing.view'), billingController.getBillingSummary);
router.get('/revenue-trend', requirePermission('billing.view'), billingController.getRevenueTrend);
router.get('/revenue-by-method', requirePermission('billing.view'), billingController.getRevenueByMethod);
router.get('/revenue-by-plan', requirePermission('billing.view'), billingController.getRevenueByPlan);

module.exports = router;
