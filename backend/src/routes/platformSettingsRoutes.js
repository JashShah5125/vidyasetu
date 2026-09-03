const express = require('express');
const router = express.Router();
const platformSettingsController = require('../controllers/platformSettingsController');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', platformSettingsController.getSettings);
router.get('/:id', platformSettingsController.getSettingById);
router.post('/', platformSettingsController.createSetting);
router.put('/:id', platformSettingsController.updateSetting);
router.delete('/:id', platformSettingsController.deleteSetting);

module.exports = router;
