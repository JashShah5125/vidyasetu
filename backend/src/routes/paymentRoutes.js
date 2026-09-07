const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/students/:id/ledger', requirePermission('fee.view'), paymentController.getStudentLedger);
router.post('/collect', requirePermission('fees:collect'), paymentController.recordPayment);
router.post('/invoices', requirePermission('fees:collect'), paymentController.createInvoice);

module.exports = router;