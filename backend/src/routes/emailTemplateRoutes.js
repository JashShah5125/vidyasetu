const express = require('express');
const router = express.Router();

const emailTemplateController = require('../controllers/emailTemplateController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createTemplateSchema, updateTemplateSchema, statusSchema } = require('../validators/emailTemplateValidator');

router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', requirePermission('email_template.view'), emailTemplateController.getTemplates);
router.get('/:id', requirePermission('email_template.view'), emailTemplateController.getTemplateById);
router.post('/', requirePermission('email_template.create'), validate(createTemplateSchema), emailTemplateController.createTemplate);
router.put('/:id', requirePermission('email_template.update'), validate(updateTemplateSchema), emailTemplateController.updateTemplate);
router.patch('/:id/status', requirePermission('email_template.update'), validate(statusSchema), emailTemplateController.updateTemplateStatus);

module.exports = router;
