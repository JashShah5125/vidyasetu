const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication and SaaS Admin privileges (with explicit permissions)
router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', requirePermission('tenant.view'), tenantController.getTenants);
router.post('/', requirePermission('tenant.create'), tenantController.createTenant);
router.get('/:id', requirePermission('tenant.view'), tenantController.getTenantById);
router.patch('/:id/status', requirePermission('tenant.update_status'), tenantController.updateTenantStatus);

module.exports = router;
