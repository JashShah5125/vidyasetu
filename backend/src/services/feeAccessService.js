const pool = require('../config/db');
const branchModel = require('../models/branchModel');
const userModel = require('../models/userModel');

/**
 * Resolves user's access context for Fee Structure queries.
 * Returns:
 * {
 *    scope: 'TENANT' | 'BRANCH',
 *    authorizedBranchId: number | null,
 *    role: string
 * }
 */
const resolveAccessContext = async (tenantId, user) => {
    if (!user) {
        return { scope: 'TENANT', authorizedBranchId: null, role: 'anonymous' };
    }

    if (user.isSaasAdmin || user.tenantId === 1) {
        return { scope: 'TENANT', authorizedBranchId: null, role: 'saas-admin' };
    }

    const uid = Number(user.userId || user.id);
    const tid = Number(tenantId);

    let roleCodes = [];
    if (uid) {
        try {
            roleCodes = await userModel.getUserRoleCodes(uid);
        } catch {
            roleCodes = [];
        }
    }

    const normalizedRole = String(user.role || user.userType || '').toLowerCase().replace(/[\s_]+/g, '-');
    const isBranchAdmin = normalizedRole === 'branch-admin'
        || normalizedRole === 'branch-manager'
        || (roleCodes && (roleCodes.includes('branch_admin') || roleCodes.includes('branch_manager')));

    if (isBranchAdmin) {
        let branchId = null;
        if (uid) {
            const userBranchIds = await branchModel.getUserBranchIds(tid, uid);
            if (userBranchIds && userBranchIds.length > 0) {
                branchId = Number(userBranchIds[0]);
            }
        }

        if (!branchId && user.branch) {
            const [bRows] = await pool.query(
                `SELECT id FROM branches WHERE tenant_id = ? AND (id = ? OR name = ? OR code = ?) AND deleted_at IS NULL LIMIT 1`,
                [tid, user.branch, user.branch, user.branch]
            );
            if (bRows.length > 0) {
                branchId = Number(bRows[0].id);
            }
        }

        return {
            scope: 'BRANCH',
            authorizedBranchId: branchId,
            role: 'branch-admin'
        };
    }

    return {
        scope: 'TENANT',
        authorizedBranchId: null,
        role: normalizedRole || 'admin'
    };
};

/**
 * Verify if an academic level belongs to a program/course assigned to a branch.
 */
const verifyLevelInBranch = async (tenantId, levelId, branchId) => {
    const tid = Number(tenantId);
    const lid = Number(levelId);
    const bid = Number(branchId);

    const [rows] = await pool.query(
        `SELECT l.id 
         FROM levels l
         LEFT JOIN programs p ON p.id = l.program_id
         LEFT JOIN branch_programs bp ON bp.program_id = p.id AND bp.branch_id = ?
         LEFT JOIN course_branches cb ON (cb.course_id = l.course_id OR cb.course_id = p.course_id) AND cb.branch_id = ?
         WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL
           AND (bp.id IS NOT NULL OR cb.course_id IS NOT NULL)
         LIMIT 1`,
        [bid, bid, lid, tid]
    );

    return rows.length > 0;
};

/**
 * Verify if a subject bundle belongs to a branch.
 */
const verifyBundleInBranch = async (tenantId, bundleId, branchId) => {
    const tid = Number(tenantId);
    const buId = Number(bundleId);
    const bid = Number(branchId);

    const [rows] = await pool.query(
        `SELECT id FROM subject_bundles 
         WHERE id = ? AND tenant_id = ? AND branch_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [buId, tid, bid]
    );

    return rows.length > 0;
};

module.exports = {
    resolveAccessContext,
    verifyLevelInBranch,
    verifyBundleInBranch
};
