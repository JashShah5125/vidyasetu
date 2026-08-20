const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/subscriptionController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', requirePermission('subscription.view'), subscriptionController.getSubscriptions);
router.get('/:id', requirePermission('subscription.view'), subscriptionController.getSubscriptionById);
router.patch('/:id/plan', requirePermission('subscription.manage'), subscriptionController.changeSubscriptionPlan);

module.exports = router;
