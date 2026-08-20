const express = require('express');
const router = express.Router();

const planController = require('../controllers/planController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', requirePermission('plan.view'), planController.getPlans);
router.get('/:id', requirePermission('plan.view'), planController.getPlanById);
router.post('/', requirePermission('plan.manage'), planController.createPlan);
router.patch('/:id/status', requirePermission('plan.manage'), planController.updatePlanStatus);

module.exports = router;
