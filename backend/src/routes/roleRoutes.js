const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

// All role routes require authentication
router.use(requireAuth);

// Permissions matrix helper endpoint
router.get('/permissions', roleController.getAllPermissions);

// Role CRUD endpoints
// List roles is accessible to all authenticated staff/admins for dropdowns and role assignment
router.get('/', roleController.listRoles);
router.get('/:id', roleController.getRoleDetails);
router.post('/', requireSaasAdmin, roleController.createRole);
router.put('/:id', requireSaasAdmin, roleController.updateRole);
router.delete('/:id', requireSaasAdmin, roleController.deleteRole);

module.exports = router;
