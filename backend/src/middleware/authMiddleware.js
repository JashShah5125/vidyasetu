const { verifyToken } = require('../utils/jwt');

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
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        
        // SaaS Admins bypass permission checks for now
        if (req.user.isSaasAdmin) {
            return next();
        }
        
        if (!req.user.permissions || !req.user.permissions.includes(action)) {
            return res.status(403).json({ status: 'error', message: `Forbidden. Missing permission: ${action}` });
        }
        
        next();
    };
};

module.exports = {
    requireAuth,
    requireSaasAdmin,
    requirePermission
};
