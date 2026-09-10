const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/students/:id/ledger', requirePermission('fee.view'), paymentController.getStudentLedger);
router.get('/students/:id/fee-assignment', requirePermission('fee.view'), paymentController.getStudentFeeAssignment);
router.put('/students/:id/fee-assignment', requirePermission('fee.update'), paymentController.updateStudentFeeAssignment);
router.post('/collect', requirePermission('fee.create'), paymentController.recordPayment);
router.post('/invoices', requirePermission('fee.create'), paymentController.createInvoice);

module.exports = router;