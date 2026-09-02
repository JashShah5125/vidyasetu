const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/userModel');

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verify Error:', error.message);
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
};

const requireSaasAdmin = (req, res, next) => {
    if (!req.user || !req.user.isSaasAdmin) {
        return res.status(403).json({ status: 'error', message: 'Forbidden. Requires SaaS Admin privileges.' });
    }
    next();
};

const requirePermission = (action) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        
        // SaaS Admins bypass permission checks for now
        if (req.user.isSaasAdmin) {
            return next();
        }
        
        try {
            // Resolve the user's effective permissions per-request from
            // role_permissions + overridden_permissions (not from the JWT).
            const permissions = await userModel.getUserPermissions(req.user.userId);
            if (!permissions.includes(action)) {
                return res.status(403).json({ status: 'error', message: `Forbidden. Missing permission: ${action}` });
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
