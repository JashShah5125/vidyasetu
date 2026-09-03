const express = require('express');
const router = express.Router();
const smsTemplateController = require('../controllers/smsTemplateController');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', smsTemplateController.getSmsTemplates);
router.get('/:id', smsTemplateController.getSmsTemplateById);
router.post('/', smsTemplateController.createSmsTemplate);
router.put('/:id', smsTemplateController.updateSmsTemplate);
router.delete('/:id', smsTemplateController.deleteSmsTemplate);

module.exports = router;
