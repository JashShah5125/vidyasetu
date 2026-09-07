const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Program-wise (full course) fee plans
router.get('/', requirePermission('fee.view'), feeController.getFeePlans);

// Subject-wise fees (level-mapped) — registered before the /:id routes
router.get('/levels/:levelId/subjects', requirePermission('fee.view'), feeController.getLevelSubjectFees);
router.put('/subject-fees', requirePermission('fee.update'), feeController.upsertSubjectFee);

// Program-wise fee upsert/clear
router.put('/:id', requirePermission('fee.update'), feeController.upsertProgramFeePlan);
router.delete('/:id', requirePermission('fee.delete'), feeController.clearProgramFeePlan);

module.exports = router;