const pool = require('../config/db');
const branchModel = require('../models/branchModel');
const userModel = require('../models/userModel');

/**
 * Normalizes role codes for checking.
 */
const isBranchAdminRole = (roleCodes = []) => {
    return roleCodes.some(r => {
        const normalized = String(r).toLowerCase().replace(/-/g, '_');
        return normalized === 'branch_admin' || normalized === 'branch_manager';
    });
};

/**
 * Resolves access context for student operations based on authenticated user and roles.
 * Returns: {
 *   scope: 'TENANT' | 'BRANCH',
 *   tenantId: number,
 *   authorizedBranchId: number | null,
 *   authorizedBranchIds: number[]
 * }
 */
const resolveAccessContext = async (tenantId, user) => {
    if (!user) {
        return {
            scope: 'TENANT',
            tenantId,
            authorizedBranchId: null,
            authorizedBranchIds: []
        };
    }

    // SaaS admins and users without tenant restrictions have full tenant scope
    if (user.isSaasAdmin || user.tenantId === 1) {
        return {
            scope: 'TENANT',
            tenantId,
            authorizedBranchId: null,
            authorizedBranchIds: []
        };
    }

    const roleCodes = await userModel.getUserRoleCodes(user.userId || user.id);
    const isBranchAdmin = isBranchAdminRole(roleCodes) || user.role === 'branch-admin' || user.role === 'branch_admin';

    if (isBranchAdmin) {
        const userBranchIds = await branchModel.getUserBranchIds(tenantId, user.userId || user.id);
        if (!userBranchIds || userBranchIds.length === 0) {
            const err = new Error('Forbidden: You have no active branch assigned to your account.');
            err.statusCode = 403;
            err.code = 'ER_NO_BRANCH_ASSIGNED';
            throw err;
        }

        return {
            scope: 'BRANCH',
            tenantId,
            authorizedBranchId: Number(userBranchIds[0]),
            authorizedBranchIds: userBranchIds.map(Number)
        };
    }

    return {
        scope: 'TENANT',
        tenantId,
        authorizedBranchId: null,
        authorizedBranchIds: []
    };
};

/**
 * Validates that a batch belongs to the specified tenant and branch.
 */
const validateBatchInBranch = async (tenantId, branchId, batchId) => {
    if (!batchId) return true;
    const [rows] = await pool.query(
        `SELECT id, branch_id, level_id FROM batches WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [Number(batchId), tenantId]
    );
    if (!rows.length) {
        const err = new Error('Batch not found for this institute.');
        err.statusCode = 404;
        err.code = 'ER_BATCH_NOT_FOUND';
        throw err;
    }
    if (Number(rows[0].branch_id) !== Number(branchId)) {
        const err = new Error(`Selected batch (ID: ${batchId}) does not belong to your authorized branch (ID: ${branchId}).`);
        err.statusCode = 403;
        err.code = 'ER_BATCH_NOT_IN_BRANCH';
        throw err;
    }
    return rows[0];
};

/**
 * Checks whether a student currently has an active enrollment in the authorized branch.
 */
const verifyStudentInBranch = async (tenantId, branchId, studentId) => {
    const [rows] = await pool.query(
        `SELECT se.id, se.branch_id
         FROM student_enrollments se
         JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
         WHERE s.tenant_id = ?
           AND s.id = ?
           AND se.branch_id = ?
           AND se.status = 'active'
           AND se.deleted_at IS NULL
         LIMIT 1`,
        [tenantId, Number(studentId), Number(branchId)]
    );
    return rows.length > 0;
};

module.exports = {
    resolveAccessContext,
    validateBatchInBranch,
    verifyStudentInBranch,
    isBranchAdminRole
};
