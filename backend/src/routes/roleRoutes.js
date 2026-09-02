const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

// All role management routes require authentication and SaaS Admin privileges
router.use(requireAuth);
router.use(requireSaasAdmin);

// Permissions matrix helper endpoint
router.get('/permissions', requirePermission('role.view'), roleController.getAllPermissions);

// Role CRUD endpoints
router.get('/', requirePermission('role.view'), roleController.listRoles);
router.get('/:id', requirePermission('role.view'), roleController.getRoleDetails);
router.post('/', requirePermission('role.create'), roleController.createRole);
router.put('/:id', requirePermission('role.update'), roleController.updateRole);
router.delete('/:id', requirePermission('role.delete'), roleController.deleteRole);

module.exports = router;
