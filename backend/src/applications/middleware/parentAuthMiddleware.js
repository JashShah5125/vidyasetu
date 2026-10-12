const pool = require('../../config/db');

/**
 * Middleware to ensure the authenticated user is a Parent/Guardian
 * and is authorized to access the requested child (:studentId).
 */
const requireParentAndChildAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const tenantId = req.user.tenantId;
        const userId = req.user.userId;

        // 1. Resolve guardianId if not already present in JWT payload
        let guardianId = req.user.guardianId;
        if (!guardianId) {
            const [guardianRows] = await pool.query(
                `SELECT id FROM guardians WHERE user_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                [userId, tenantId]
            );
            if (!guardianRows.length) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Guardian profile not found for this account.'
                });
            }
            guardianId = guardianRows[0].id;
            req.user.guardianId = guardianId;
        }

        // 2. If a specific studentId is provided in params, query, or body, verify relationship
        const requestedStudentId = req.params?.studentId || req.query?.studentId || req.body?.studentId;
        if (requestedStudentId) {
            const [linkRows] = await pool.query(
                `SELECT student_id, is_primary FROM student_guardians WHERE guardian_id = ? AND student_id = ? AND tenant_id = ? LIMIT 1`,
                [guardianId, requestedStudentId, tenantId]
            );

            if (!linkRows.length) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You do not have permission to view or manage records for this student.'
                });
            }

            req.childStudentId = Number(requestedStudentId);
            req.isPrimaryGuardian = Boolean(linkRows[0].is_primary);
        }

        next();
    } catch (error) {
        console.error('Guardian authorization error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error during guardian authorization.'
        });
    }
};

module.exports = {
    requireParentAndChildAccess
};
