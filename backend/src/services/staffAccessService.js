const pool = require('../config/db');
const branchModel = require('../models/branchModel');
const userModel = require('../models/userModel');

/**
 * Normalizes role codes for checking.
 */
const isBranchAdminRole = (roleCodes = []) => {
    return roleCodes.some(r => {
        const normalized = String(r).toLowerCase().replace(/[\s-]+/g, '_');
        return normalized === 'branch_admin' || normalized === 'branch_manager';
    });
};

const FORBIDDEN_ADMIN_ROLE_CODES = [
    'institute_admin',
    'inst_admin',
    'saas_admin',
    'branch_admin',
    'branch_manager',
    'super_admin',
    'owner',
    'platform_admin'
];

/**
 * Resolves access context for staff operations.
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
 * Validates that assigned roles do not contain forbidden administrative roles.
 */
const validateRolesForBranchAdmin = async (tenantId, roles = [], roleIds = []) => {
    let roleCodes = [];

    if (Array.isArray(roleIds) && roleIds.length > 0) {
        const [rows] = await pool.query(
            `SELECT code, name FROM roles WHERE id IN (?)`,
            [roleIds.map(Number).filter(Boolean)]
        );
        roleCodes.push(...rows.map(r => r.code.toLowerCase().replace(/[\s-]+/g, '_')));
    }

    if (Array.isArray(roles) && roles.length > 0) {
        for (const r of roles) {
            roleCodes.push(String(r).toLowerCase().replace(/[\s-]+/g, '_'));
        }
    }

    for (const code of roleCodes) {
        if (FORBIDDEN_ADMIN_ROLE_CODES.includes(code)) {
            const err = new Error(`Forbidden: Branch Admins cannot assign administrative roles ('${code}'). Only operational roles (Teacher, Counsellor, Finance, Non-Teaching) are permitted.`);
            err.statusCode = 403;
            err.code = 'ER_PRIVILEGE_ESCALATION';
            throw err;
        }
    }

    return true;
};

/**
 * Validates that all allocated batches belong to the authorized branch.
 */
const validateBatchesInBranch = async (tenantId, branchId, batchIds = []) => {
    if (!batchIds || batchIds.length === 0) return true;
    const cleanIds = batchIds.map(Number).filter(Boolean);
    if (cleanIds.length === 0) return true;

    const [rows] = await pool.query(
        `SELECT id, branch_id, name FROM batches WHERE id IN (?) AND tenant_id = ? AND deleted_at IS NULL`,
        [cleanIds, tenantId]
    );

    for (const bRow of rows) {
        if (Number(bRow.branch_id) !== Number(branchId)) {
            const err = new Error(`Forbidden: Batch '${bRow.name}' (ID: ${bRow.id}) belongs to branch ${bRow.branch_id}, not your authorized branch (ID: ${branchId}).`);
            err.statusCode = 403;
            err.code = 'ER_BATCH_NOT_IN_BRANCH';
            throw err;
        }
    }

    return true;
};

/**
 * Checks whether a staff member has operational access in the authorized branch.
 */
const verifyStaffInBranch = async (tenantId, branchId, staffId) => {
    const [rows] = await pool.query(
        `SELECT sp.id, sp.user_id, sp.branch_ids
         FROM staff_profiles sp
         JOIN users u ON sp.user_id = u.id AND u.deleted_at IS NULL
         LEFT JOIN user_branch_access uba ON u.id = uba.user_id AND uba.branch_id = ?
         WHERE sp.tenant_id = ?
           AND sp.id = ?
           AND sp.deleted_at IS NULL
           AND (uba.id IS NOT NULL OR JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON)))
         LIMIT 1`,
        [Number(branchId), tenantId, Number(staffId), Number(branchId)]
    );
    return rows.length > 0;
};

module.exports = {
    resolveAccessContext,
    validateRolesForBranchAdmin,
    validateBatchesInBranch,
    verifyStaffInBranch,
    isBranchAdminRole,
    FORBIDDEN_ADMIN_ROLE_CODES
};
