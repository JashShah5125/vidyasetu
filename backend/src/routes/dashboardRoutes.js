const express = require('express');
const router = express.Router();
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// All dashboard endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/admin/dashboard/institute
 * Single consolidated executive dashboard for Institute Admin (and SaaS Admin)
 */
router.get('/institute', dashboardController.getInstituteDashboard);

/**
 * GET /api/admin/dashboard/branch
 * Single consolidated executive dashboard for Branch Admin (strictly branch-scoped)
 */
router.get('/branch', dashboardController.getBranchDashboard);

/**
 * GET /api/admin/dashboard/institute-stats
 * Legacy KPI statistics
 */
router.get('/institute-stats', dashboardController.getInstituteStats);

/**
 * GET /api/admin/dashboard/saas-stats
 * SaaS Admin dashboard overview
 */
router.get('/saas-stats', requireSaasAdmin, dashboardController.getSaasStats);

/**
 * GET /api/admin/dashboard/academic-years
 * Dynamic academic year list for filters
 */
router.get('/academic-years', dashboardController.getAcademicYears);

/**
 * GET /api/admin/dashboard/saas-revenue
 * SaaS MRR and revenue trends
 */
router.get('/saas-revenue', requireSaasAdmin, dashboardController.getSaasRevenue);

module.exports = router;
