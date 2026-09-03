const express = require('express');
const router = express.Router();
const whatsappTemplateController = require('../controllers/whatsappTemplateController');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', whatsappTemplateController.getWhatsAppTemplates);
router.get('/:id', whatsappTemplateController.getWhatsAppTemplateById);
router.post('/', whatsappTemplateController.createWhatsAppTemplate);
router.put('/:id', whatsappTemplateController.updateWhatsAppTemplate);
router.delete('/:id', whatsappTemplateController.deleteWhatsAppTemplate);

module.exports = router;
