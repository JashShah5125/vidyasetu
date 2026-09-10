const pool = require('../config/db');

// ─── Program-wise (Full Course) Fees ────────────────────────────────────────

const listProgramFeePlans = async (tenantId, {
    programId = null,
    courseId = null,
    search = '',
    limit = 10,
    offset = 0
} = {}, accessContext = null) => {
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const branchId = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    let joinBranch = '';
    let branchWhere = '';
    const branchParams = [];

    if (isBranchScope) {
        joinBranch = `
            JOIN course_branches cb ON cb.course_id = p.course_id AND cb.branch_id = ?
            JOIN branch_programs bp ON bp.program_id = p.id AND bp.branch_id = ?
        `;
        branchParams.push(branchId, branchId);
    }

    let where = 'p.tenant_id = ? AND p.deleted_at IS NULL';
    const params = [tenantId];

    if (programId) {
        where += ' AND p.id = ?';
        params.push(programId);
    }
    if (courseId) {
        where += ' AND p.course_id = ?';
        params.push(courseId);
    }
    if (search) {
        where += ' AND (p.name LIKE ? OR p.code LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }

    const queryParams = [...branchParams, ...params];

    const [rows] = await pool.query(
        `SELECT DISTINCT
            p.id,
            p.tenant_id,
            p.course_id,
            p.name,
            p.code,
            p.duration,
            p.total_fee,
            p.down_payment,
            p.installment_months,
            p.is_active,
            c.name AS course_name,
            c.code AS course_code
         FROM programs p
         JOIN courses c ON c.id = p.course_id
         ${joinBranch}
         WHERE ${where}
         ORDER BY c.name ASC, p.name ASC
         LIMIT ? OFFSET ?`,
        [...queryParams, Number(limit), Number(offset)]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(DISTINCT p.id) AS total 
         FROM programs p 
         JOIN courses c ON c.id = p.course_id
         ${joinBranch}
         WHERE ${where}`,
        queryParams
    );

    const data = rows.map(row => ({
        id: String(row.id),
        tenant_id: String(row.tenant_id),
        course_id: String(row.course_id),
        course_name: row.course_name,
        course_code: row.course_code,
        name: row.name,
        code: row.code,
        duration: row.duration,
        totalFees: row.total_fee !== null && row.total_fee !== undefined ? Number(row.total_fee) : 0,
        downPayment: row.down_payment !== null && row.down_payment !== undefined ? Number(row.down_payment) : 0,
        months: row.installment_months || 0,
        installment: (row.total_fee !== null && row.down_payment !== null && row.installment_months)
            ? Number(((Number(row.total_fee) - Number(row.down_payment)) / Number(row.installment_months)).toFixed(2))
            : 0,
        is_active: !!row.is_active
    }));

    return { data, total: countRows[0].total };
};

const upsertProgramFee = async (tenantId, programId, data, userId) => {
    const { totalFee, downPayment, months } = data;

    const [existingRows] = await pool.query(
        'SELECT id FROM programs WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL',
        [programId, tenantId]
    );
    if (existingRows.length === 0) return null;

    const total = totalFee !== undefined && totalFee !== null ? Number(totalFee) : null;
    const down = downPayment !== undefined && downPayment !== null ? Number(downPayment) : null;
    const m = months !== undefined && months !== null ? Number(months) : null;

    await pool.query(
        `UPDATE programs
         SET total_fee = ?, down_payment = ?, installment_months = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [total, down, m, userId, programId, tenantId]
    );

    return { id: String(programId) };
};

const clearProgramFee = async (tenantId, programId, userId) => {
    const [result] = await pool.query(
        `UPDATE programs
         SET total_fee = NULL, down_payment = NULL, installment_months = NULL, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [userId, programId, tenantId]
    );
    return result.affectedRows > 0;
};

// ─── Subject-wise Fees ────────────────────────────────────────────────────

const getLevelSubjectFees = async (tenantId, levelId, accessContext = null) => {
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const branchId = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    let branchJoin = '';
    const branchParams = [];

    if (isBranchScope) {
        branchJoin = `
            JOIN programs p ON p.id = l.program_id
            JOIN branch_programs bp ON bp.program_id = p.id AND bp.branch_id = ?
            JOIN course_branches cb ON cb.course_id = p.course_id AND cb.branch_id = ?
        `;
        branchParams.push(branchId, branchId);
    }

    const [rows] = await pool.query(
        `SELECT
            s.id,
            s.name,
            s.code,
            s.type,
            COALESCE(sf.fee_amount, 0) AS fee_amount
         FROM level_subjects ls
         JOIN levels l ON l.id = ls.level_id
         JOIN subjects s ON s.id = ls.subject_id
         LEFT JOIN subject_fees sf ON sf.level_id = ls.level_id AND sf.subject_id = ls.subject_id AND sf.deleted_at IS NULL
         ${branchJoin}
         WHERE ls.level_id = ? AND ls.tenant_id = ? AND s.deleted_at IS NULL
         ORDER BY s.name ASC`,
        [...branchParams, levelId, tenantId]
    );

    return rows.map(row => ({
        id: String(row.id),
        name: row.name,
        code: row.code,
        type: row.type,
        fee: Number(row.fee_amount)
    }));
};

const upsertSubjectFee = async (tenantId, data, userId) => {
    const { levelId, subjectId, feeAmount } = data;

    // Validate the level belongs to the tenant and the subject is mapped to it.
    const [linkRows] = await pool.query(
        `SELECT ls.id FROM level_subjects ls
         JOIN levels l ON l.id = ls.level_id
         WHERE ls.level_id = ? AND ls.subject_id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL`,
        [levelId, subjectId, tenantId]
    );
    if (linkRows.length === 0) return null;

    const amount = feeAmount !== undefined && feeAmount !== null ? Number(feeAmount) : 0;

    await pool.query(
        `INSERT INTO subject_fees (tenant_id, level_id, subject_id, fee_amount, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            fee_amount = VALUES(fee_amount),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL`,
        [tenantId, levelId, subjectId, amount, userId, userId]
    );

    return { levelId: String(levelId), subjectId: String(subjectId) };
};

module.exports = {
    listProgramFeePlans,
    upsertProgramFee,
    clearProgramFee,
    getLevelSubjectFees,
    upsertSubjectFee
};