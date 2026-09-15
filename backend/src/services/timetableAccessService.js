const pool = require('../config/db');
const branchModel = require('../models/branchModel');
const userModel = require('../models/userModel');

/**
 * Normalizes role codes for checking branch admin status.
 */
const isBranchAdminRole = (roleCodes = []) => {
    return roleCodes.some(r => {
        const normalized = String(r).toLowerCase().replace(/[\s-]+/g, '_');
        return normalized === 'branch_admin' || normalized === 'branch_manager';
    });
};

/**
 * Resolves access context for timetable operations.
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
        let userBranchIds = await branchModel.getUserBranchIds(tenantId, user.userId || user.id);
        if ((!userBranchIds || userBranchIds.length === 0) && user.branchId) {
            userBranchIds = [user.branchId];
        }

        if (!userBranchIds || userBranchIds.length === 0) {
            const err = new Error('Forbidden: You have no active branch assigned to your account.');
            err.statusCode = 403;
            err.code = 'ER_NO_BRANCH_ASSIGNED';
            throw err;
        }

        const effectiveBranchId = user.branchId && userBranchIds.map(Number).includes(Number(user.branchId))
            ? Number(user.branchId)
            : Number(userBranchIds[0]);

        return {
            scope: 'BRANCH',
            tenantId,
            authorizedBranchId: effectiveBranchId,
            authorizedBranchIds: userBranchIds.map(Number)
        };
    }

    // Fallback: check if user token has explicit branchId (e.g. if scoped by login)
    if (user.branchId) {
        return {
            scope: 'BRANCH',
            tenantId,
            authorizedBranchId: Number(user.branchId),
            authorizedBranchIds: [Number(user.branchId)]
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
    if (!batchId) return null;
    const isNum = !isNaN(Number(batchId)) && String(batchId).trim() !== '';
    let rows;
    if (isNum) {
        [rows] = await pool.query(
            `SELECT id, branch_id, level_id, academic_year_id, name, code 
             FROM batches 
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [Number(batchId), tenantId]
        );
    } else {
        [rows] = await pool.query(
            `SELECT id, branch_id, level_id, academic_year_id, name, code 
             FROM batches 
             WHERE (name = ? OR code = ?) AND tenant_id = ? AND deleted_at IS NULL`,
            [String(batchId), String(batchId), tenantId]
        );
    }
    if (!rows.length) {
        const err = new Error(`Batch not found ('${batchId}').`);
        err.statusCode = 404;
        err.code = 'ER_BATCH_NOT_FOUND';
        throw err;
    }
    if (branchId && Number(rows[0].branch_id) !== Number(branchId)) {
        const err = new Error(`Forbidden: Batch '${rows[0].name}' belongs to branch ${rows[0].branch_id}, not your authorized branch (ID: ${branchId}).`);
        err.statusCode = 403;
        err.code = 'ER_BATCH_NOT_IN_BRANCH';
        throw err;
    }
    return rows[0];
};

/**
 * Validates that all target batches belong to the specified tenant and branch.
 */
const validateBatchesInBranch = async (tenantId, branchId, batchIds = []) => {
    if (!batchIds || batchIds.length === 0) return true;
    const cleanIds = batchIds.map(Number).filter(Boolean);
    if (cleanIds.length === 0) return true;

    const [rows] = await pool.query(
        `SELECT id, branch_id, name FROM batches WHERE id IN (?) AND tenant_id = ? AND deleted_at IS NULL`,
        [cleanIds, tenantId]
    );

    const foundIds = new Set(rows.map(r => Number(r.id)));
    for (const bId of cleanIds) {
        if (!foundIds.has(bId)) {
            const err = new Error(`Batch with ID ${bId} was not found.`);
            err.statusCode = 404;
            err.code = 'ER_BATCH_NOT_FOUND';
            throw err;
        }
    }

    for (const bRow of rows) {
        if (Number(bRow.branch_id) !== Number(branchId)) {
            const err = new Error(`Forbidden: Target batch '${bRow.name}' (ID: ${bRow.id}) belongs to branch ${bRow.branch_id}, not your authorized branch (ID: ${branchId}).`);
            err.statusCode = 403;
            err.code = 'ER_BATCH_NOT_IN_BRANCH';
            throw err;
        }
    }

    return true;
};

/**
 * Validates that a classroom belongs to the specified tenant and branch.
 */
const validateClassroomInBranch = async (tenantId, branchId, classroomId) => {
    if (!classroomId) return null;
    const isNum = !isNaN(Number(classroomId)) && String(classroomId).trim() !== '';
    let rows;
    if (isNum) {
        [rows] = await pool.query(
            `SELECT id, branch_id, name, room_number 
             FROM classrooms 
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [Number(classroomId), tenantId]
        );
    } else {
        [rows] = await pool.query(
            `SELECT id, branch_id, name, room_number 
             FROM classrooms 
             WHERE (name = ? OR room_number = ?) AND tenant_id = ? AND deleted_at IS NULL`,
            [String(classroomId), String(classroomId), tenantId]
        );
    }
    if (!rows.length) {
        const err = new Error(`Classroom not found ('${classroomId}').`);
        err.statusCode = 404;
        err.code = 'ER_CLASSROOM_NOT_FOUND';
        throw err;
    }
    if (branchId && Number(rows[0].branch_id) !== Number(branchId)) {
        const err = new Error(`Forbidden: Classroom '${rows[0].name}' belongs to branch ${rows[0].branch_id}, not your authorized branch (ID: ${branchId}).`);
        err.statusCode = 403;
        err.code = 'ER_CLASSROOM_NOT_IN_BRANCH';
        throw err;
    }
    return rows[0];
};

/**
 * Validates that a teacher is authorized for the branch.
 */
const validateTeacherInBranch = async (tenantId, branchId, teacherUserId) => {
    if (!teacherUserId) return null;
    const isNum = !isNaN(Number(teacherUserId)) && String(teacherUserId).trim() !== '';
    const teacherParam = isNum ? Number(teacherUserId) : String(teacherUserId);
    const idClause = isNum ? `u.id = ?` : `(u.name = ? OR u.email = ?)`;
    const idParams = isNum ? [teacherParam] : [teacherParam, teacherParam];

    const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM users u
         LEFT JOIN staff_profiles sp ON u.id = sp.user_id AND sp.tenant_id = u.tenant_id
         LEFT JOIN user_branch_access uba ON u.id = uba.user_id AND uba.branch_id = ?
         WHERE u.tenant_id = ?
           AND ${idClause}
           AND u.deleted_at IS NULL
           AND (
             uba.id IS NOT NULL 
             OR JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON))
             OR EXISTS (SELECT 1 FROM teacher_allocations ta WHERE ta.teacher_user_id = u.id AND ta.branch_id = ? AND ta.tenant_id = ?)
           )
         LIMIT 1`,
        [Number(branchId), tenantId, ...idParams, Number(branchId), Number(branchId), tenantId]
    );

    if (!rows.length) {
        const err = new Error(`Forbidden: Faculty / Teacher ('${teacherUserId}') is not authorized or associated with branch ID ${branchId}.`);
        err.statusCode = 403;
        err.code = 'ER_TEACHER_NOT_IN_BRANCH';
        throw err;
    }
    return rows[0];
};

/**
 * Validates that a subject exists and is available in tenant.
 */
const validateSubjectInBranch = async (tenantId, branchId, subjectId) => {
    if (!subjectId) return null;
    const isNum = !isNaN(Number(subjectId)) && String(subjectId).trim() !== '';
    let rows;
    if (isNum) {
        [rows] = await pool.query(
            `SELECT id, name, code, status 
             FROM subjects 
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [Number(subjectId), tenantId]
        );
    } else {
        [rows] = await pool.query(
            `SELECT id, name, code, status 
             FROM subjects 
             WHERE (name = ? OR code = ?) AND tenant_id = ? AND deleted_at IS NULL`,
            [String(subjectId), String(subjectId), tenantId]
        );
    }
    if (!rows.length) {
        const err = new Error(`Subject not found ('${subjectId}').`);
        err.statusCode = 404;
        err.code = 'ER_SUBJECT_NOT_FOUND';
        throw err;
    }
    return rows[0];
};

/**
 * Validates that a lecture exists and belongs to the authorized branch and tenant.
 */
const validateLectureInBranch = async (tenantId, branchId, lectureId) => {
    if (!lectureId) {
        const err = new Error('Lecture ID is required.');
        err.statusCode = 400;
        throw err;
    }

    const [rows] = await pool.query(
        `SELECT l.*, b.name AS batch_name
         FROM lectures l
         LEFT JOIN batches b ON l.batch_id = b.id
         WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL`,
        [Number(lectureId), tenantId]
    );

    if (!rows.length) {
        const err = new Error(`Lecture not found (ID: ${lectureId}).`);
        err.statusCode = 404;
        err.code = 'ER_LECTURE_NOT_FOUND';
        throw err;
    }

    const lecture = rows[0];
    if (branchId && Number(lecture.branch_id) !== Number(branchId)) {
        const err = new Error(`Forbidden: Lecture (ID: ${lectureId}) belongs to branch ${lecture.branch_id}, not your authorized branch (ID: ${branchId}).`);
        err.statusCode = 403;
        err.code = 'ER_LECTURE_NOT_IN_BRANCH';
        throw err;
    }

    return lecture;
};

module.exports = {
    resolveAccessContext,
    validateBatchInBranch,
    validateBatchesInBranch,
    validateClassroomInBranch,
    validateTeacherInBranch,
    validateSubjectInBranch,
    validateLectureInBranch,
    isBranchAdminRole
};
