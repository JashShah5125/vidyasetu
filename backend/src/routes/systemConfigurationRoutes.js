const express = require('express');
const router = express.Router();

const systemConfigurationController = require('../controllers/systemConfigurationController');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { upsertSchema, isEnabledSchema, validateChannelType } = require('../validators/systemConfigurationValidator');

router.use(requireAuth);
router.use(requireSaasAdmin);

const validateChannelParam = (req, res, next) => {
    const { channelType } = req.params;
    if (!validateChannelType(channelType)) {
        return res.status(400).json({
            status: 'error',
            message: `Unsupported channel type: ${channelType}. Must be one of SMS, EMAIL, WHATSAPP.`
        });
    }
    next();
};

router.get('/', systemConfigurationController.getAllConfigs);
router.get('/:channelType/providers', validateChannelParam, systemConfigurationController.getProviders);
router.get('/:channelType', validateChannelParam, systemConfigurationController.getConfig);
router.put('/:channelType', validateChannelParam, validate(upsertSchema), systemConfigurationController.saveConfig);
router.patch('/:channelType/toggle', validateChannelParam, validate(isEnabledSchema), systemConfigurationController.toggleConfig);

module.exports = router;
