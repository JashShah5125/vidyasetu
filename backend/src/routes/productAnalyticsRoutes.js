const express = require('express');
const router = express.Router();
const productAnalyticsController = require('../controllers/productAnalyticsController');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

// All analytics endpoints require SaaS Admin authentication
router.use(requireAuth);
router.use(requireSaasAdmin);

// Overview of branches and users analytics
router.get('/overview', productAnalyticsController.getOverviewAnalytics);

// Specific sub-endpoints
router.get('/branches', productAnalyticsController.getBranchAnalytics);
router.get('/users', productAnalyticsController.getUserAnalytics);
router.get('/module-usage', productAnalyticsController.getModuleUsage);

module.exports = router;
