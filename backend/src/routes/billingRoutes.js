const express = require('express');
const router = express.Router();

const billingController = require('../controllers/billingController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/invoices', requirePermission('billing.view'), billingController.getInvoices);
router.get('/invoices/:id', requirePermission('billing.view'), billingController.getInvoiceById);
router.post('/invoices', requirePermission('billing.create'), billingController.createInvoice);
router.put('/invoices/:id', requirePermission('billing.update'), billingController.updateInvoice);
router.delete('/invoices/:id', requirePermission('billing.delete'), billingController.deleteInvoice);
router.get('/summary', requirePermission('billing.view'), billingController.getBillingSummary);
router.get('/revenue-trend', requirePermission('billing.view'), billingController.getRevenueTrend);
router.get('/revenue-by-method', requirePermission('billing.view'), billingController.getRevenueByMethod);
router.get('/revenue-by-plan', requirePermission('billing.view'), billingController.getRevenueByPlan);

module.exports = router;
