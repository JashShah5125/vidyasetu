const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireAuth } = require('../middleware/authMiddleware');
const userModel = require('../models/userModel');

/**
 * Middleware: Verify user is authenticated and is authorized to view audit logs.
 * Grants access to:
 * - SaaS Super Admins & Impersonation sessions
 * - Institute Admins (inst_admin / institute_admin)
 * - Branch Admins (branch_admin)
 * - Any staff user granted 'audit_log.view' permission
 */
const canViewAuditLogs = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    // SaaS Super Admin & Impersonation
    if (req.user.isSaasAdmin || req.user.isImpersonated) {
        return next();
    }

    // Check userType or role on token
    const userRole = String(req.user.userType || req.user.role || '').toLowerCase();
    const adminRoles = ['saas_admin', 'saas-admin', 'inst_admin', 'inst-admin', 'institute_admin', 'branch_admin', 'branch-admin', 'admin'];
    if (adminRoles.includes(userRole)) {
        return next();
    }

    // Check assigned DB roles and permissions
    try {
        const userId = req.user.userId || req.user.id;
        const roleCodes = await userModel.getUserRoleCodes(userId);
        if (roleCodes.some(r => adminRoles.includes(r.toLowerCase()))) {
            return next();
        }

        const permissions = await userModel.getUserPermissions(userId);
        if (permissions.includes('audit_log.view') || permissions.includes('settings.view')) {
            return next();
        }
    } catch (e) {
        console.warn('⚠️ [canViewAuditLogs] Permission check warning:', e.message);
    }

    return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You do not have permission to view audit trail logs.'
    });
};

router.get('/', requireAuth, canViewAuditLogs, auditLogController.getLogs);
router.get('/meta', requireAuth, canViewAuditLogs, auditLogController.getMeta);

module.exports = router;
