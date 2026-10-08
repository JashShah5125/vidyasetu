const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/userModel');

const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        req.user.tenantId = decoded.tenantId || decoded.tenant_id;
        req.user.tenant_id = req.user.tenantId;
        req.user.userId = decoded.userId || decoded.id;
        req.user.id = req.user.userId;

        if (decoded.isImpersonated) {
            req.user.isImpersonated = true;
        }

        // Verify active role assignment in user_roles table or SaaS Admin status
        const roleCodes = await userModel.getUserRoleCodes(decoded.userId);
        let isSaasAdmin = !decoded.isImpersonated && (decoded.isSaasAdmin || decoded.tenantId === 1 || decoded.userType === 'saas_admin' || decoded.userType === 'saas-admin' || roleCodes.includes('saas_admin') || roleCodes.includes('saas-admin'));

        if (isSaasAdmin) {
            req.user.isSaasAdmin = true;
        }

        let isTeacher = decoded.userType === 'teacher' || roleCodes.includes('teacher');
        if (isTeacher) {
            req.user.isTeacher = true;
        }

        if (!isSaasAdmin && !isTeacher && !decoded.isImpersonated && (!roleCodes || roleCodes.length === 0)) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. No active security role assigned to your account. Please contact system administrator.'
            });
        }

        next();
    } catch (error) {
        console.error('JWT Verify Error:', error.message);
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
};

const requireSaasAdmin = (req, res, next) => {
    if (!req.user || !req.user.isSaasAdmin || req.user.isImpersonated) {
        return res.status(403).json({ status: 'error', message: 'Forbidden. Requires active SaaS Admin privileges.' });
    }
    next();
};

const requirePermission = (action) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        
        // SaaS Super Admins and Impersonating Admins have full unrestricted access to perform and edit all actions
        if (req.user.isSaasAdmin || req.user.isImpersonated) {
            return next();
        }
        
        try {
            // Resolve the user's effective permissions per-request from
            // role_permissions + overridden_permissions (not from the JWT).
            const userId = req.user.userId || req.user.id;
            const permissions = await userModel.getUserPermissions(userId);
            
            const requiredActions = Array.isArray(action) ? action : [action];
            const hasPermission = requiredActions.some(act => permissions.includes(act));

            if (!hasPermission) {
                return res.status(403).json({ 
                    status: 'error', 
                    message: `Forbidden. Missing required permission: ${requiredActions.join(' or ')}` 
                });
            }
            next();
        } catch (error) {
            console.error('Permission check error:', error.message);
            return res.status(500).json({ status: 'error', message: 'Internal server error during permission check' });
        }
    };
};

module.exports = {
    requireAuth,
    requireSaasAdmin,
    requirePermission
};
