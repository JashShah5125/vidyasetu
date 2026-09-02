const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All branch routes require authentication.
router.use(requireAuth);

router.get('/', requirePermission('branch.view'), branchController.getBranches);
router.post('/', requirePermission('branch.create'), branchController.createBranch);
router.get('/:code', requirePermission('branch.view'), branchController.getBranch);
router.put('/:code', requirePermission('branch.update'), branchController.updateBranch);
router.delete('/:code', requirePermission('branch.delete'), branchController.deleteBranch);

module.exports = router;