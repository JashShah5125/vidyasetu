const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// Both endpoints protected by requireAuth and permission check for audit_log.view
router.get('/', requireAuth, requirePermission('audit_log.view'), auditLogController.getLogs);
router.get('/meta', requireAuth, requirePermission('audit_log.view'), auditLogController.getMeta);

module.exports = router;
