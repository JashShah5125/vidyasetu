const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundleController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', requirePermission('bundle.view'), bundleController.getBundles);
router.post('/', requirePermission('bundle.create'), bundleController.createBundle);
router.get('/:id', requirePermission('bundle.view'), bundleController.getBundleById);
router.put('/:id', requirePermission('bundle.update'), bundleController.updateBundle);
router.delete('/:id', requirePermission('bundle.delete'), bundleController.deleteBundle);

module.exports = router;