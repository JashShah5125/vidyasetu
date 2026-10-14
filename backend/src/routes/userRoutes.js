const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

// All user management routes require authentication and SaaS Admin privileges
router.use(requireAuth);
router.use(requireSaasAdmin);

// Meta helper endpoints for frontend select dropdowns
router.get('/roles', requirePermission('user.view'), userController.getRoles);
router.get('/tenants', requirePermission('user.view'), userController.getTenants);
router.get('/tenants/:tenantId/branches', requirePermission('user.view'), userController.getTenantBranches);

// User CRUD endpoints
router.get('/', requirePermission('user.view'), userController.listUsers);
router.get('/:id', requirePermission('user.view'), userController.getUserById);
router.get('/:id/inherited-permissions', requirePermission('user.view'), userController.getUserInheritedPermissions);
router.post('/', requirePermission('user.create'), userController.createUser);
router.put('/:id', requirePermission('user.update'), userController.updateUser);
router.delete('/:id', requirePermission('user.delete'), userController.deleteUser);
router.delete('/:id/roles/:roleId', requirePermission('user.update'), userController.removeUserRole);
router.put('/:id/roles/:roleId', requirePermission('user.update'), userController.changeUserRole);
router.post('/:id/roles', requirePermission('user.update'), userController.assignUserRole);
router.post('/:id/overrides', requirePermission('user.update'), userController.addPermissionOverride);
router.delete('/:id/overrides/:overrideId', requirePermission('user.update'), userController.removePermissionOverride);
router.post('/:id/reset-password', requirePermission('user.update'), userController.resetPassword);

// User branch access endpoints
router.get('/:id/branches/available', requirePermission('user.view'), userController.getUserAvailableBranches);
router.post('/:id/branches', requirePermission('user.update'), userController.assignUserBranchAccess);
router.delete('/:id/branches/:branchId', requirePermission('user.update'), userController.removeUserBranchAccess);
router.put('/:id/branches/:branchId/primary', requirePermission('user.update'), userController.setUserPrimaryBranch);

module.exports = router;
