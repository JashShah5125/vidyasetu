const express = require('express');
const router = express.Router();

const billingController = require('../controllers/billingController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/invoices', requirePermission('billing.view'), billingController.getInvoices);
router.get('/summary', requirePermission('billing.view'), billingController.getBillingSummary);

module.exports = router;
