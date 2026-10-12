const express = require('express');
const router = express.Router();
const appParentHomeController = require('../controllers/appParentHomeController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');
const { requireParentAndChildAccess } = require('../middleware/parentAuthMiddleware');

// All routes require Parent Authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/parent/home
 * @desc    Get Parent Home aggregated dashboard (Powers Parent - Home.png)
 * @access  Private (Parent)
 */
router.get('/home', requirePermission('parent.home.view'), requireParentAndChildAccess, (req, res) => appParentHomeController.getHomeDashboard(req, res));

/**
 * @route   GET /api/app/parent/children
 * @desc    Get list of all linked children for parent
 * @access  Private (Parent)
 */
router.get('/children', requirePermission('parent.home.view'), requireParentAndChildAccess, (req, res) => appParentHomeController.getChildren(req, res));

/**
 * @route   GET /api/app/parent/children/:studentId/overview
 * @desc    Get single child deep-dive snapshot (Powers Parent - Child Overview.png)
 * @access  Private (Parent)
 */
router.get('/children/:studentId/overview', requirePermission('parent.home.view'), requireParentAndChildAccess, (req, res) => appParentHomeController.getChildOverview(req, res));

module.exports = router;
