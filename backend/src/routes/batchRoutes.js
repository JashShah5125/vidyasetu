const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// All batch routes require authentication.
router.use(requireAuth);

router.get('/academic-years', requirePermission('batch.view'), batchController.getAcademicYears);
router.get('/', requirePermission('batch.view'), batchController.getBatches);
router.post('/', requirePermission('batch.create'), batchController.createBatch);
router.get('/:id', requirePermission('batch.view'), batchController.getBatch);
router.put('/:id', requirePermission('batch.update'), batchController.updateBatch);
router.delete('/:id', requirePermission('batch.delete'), batchController.deleteBatch);

module.exports = router;