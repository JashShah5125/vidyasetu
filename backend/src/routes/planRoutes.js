const express = require('express');
const router = express.Router();

const planController = require('../controllers/planController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', planController.getPlans);
router.get('/:id', planController.getPlanById);
router.post('/', requireSaasAdmin, requirePermission('plan.manage'), planController.createPlan);
router.put('/:id', requireSaasAdmin, requirePermission('plan.manage'), planController.updatePlan);
router.put('/:id/visibility', requireSaasAdmin, requirePermission('plan.manage'), planController.updatePlanVisibility);
router.patch('/:id/status', requireSaasAdmin, requirePermission('plan.manage'), planController.updatePlanStatus);
router.delete('/:id', requireSaasAdmin, requirePermission('plan.manage'), planController.deletePlan);

module.exports = router;
