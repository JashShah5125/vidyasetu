const pool = require('../config/db');

const BUNDLE_SELECT = `
    SELECT
        sb.id,
        sb.tenant_id,
        sb.branch_id,
        sb.level_id,
        sb.name,
        sb.description,
        sb.fee_amount,
        sb.fee_plan_id,
        sb.subject_ids,
        sb.is_active,
        sb.created_at,
        sb.updated_at,
        sb.created_by,
        sb.updated_by,
        COALESCE(JSON_LENGTH(sb.subject_ids), 0) AS subject_count
    FROM subject_bundles sb
`;

const getBundles = async (tenantId, {
    levelId = null,
    branchId = null,
    search = '',
    status = 'all',
    limit = 10,
    offset = 0
} = {}, accessContext = null) => {
    const isBranchScope = (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) || Boolean(branchId);
    const effectiveBranchId = isBranchScope ? Number(accessContext?.authorizedBranchId || branchId) : null;

    let branchJoin = '';
    const branchParams = [];

    if (isBranchScope && effectiveBranchId) {
        branchJoin = `
            JOIN levels l ON l.id = sb.level_id
            JOIN programs p ON p.id = l.program_id
            JOIN courses c ON c.id = p.course_id
            JOIN branch_programs bp ON bp.program_id = p.id AND bp.branch_id = ?
            JOIN course_branches cb ON cb.course_id = c.id AND cb.branch_id = ?
        `;
        branchParams.push(effectiveBranchId, effectiveBranchId);
    }

    let where = 'sb.tenant_id = ? AND sb.deleted_at IS NULL';
    const params = [tenantId];

    if (effectiveBranchId) {
        where += ' AND (sb.branch_id IS NULL OR sb.branch_id = ?)';
        params.push(effectiveBranchId);
    }
    if (levelId) {
        where += ' AND sb.level_id = ?';
        params.push(levelId);
    }
    if (search) {
        where += ' AND sb.name LIKE ?';
        params.push(`%${search}%`);
    }
    if (status === 'active') {
        where += ' AND sb.is_active = 1';
    } else if (status === 'inactive') {
        where += ' AND sb.is_active = 0';
    }

    const queryParams = [...branchParams, ...params];

    const [rows] = await pool.query(
        `${BUNDLE_SELECT} ${branchJoin} WHERE ${where} ORDER BY sb.name ASC LIMIT ? OFFSET ?`,
        [...queryParams, Number(limit), Number(offset)]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(DISTINCT sb.id) AS total FROM subject_bundles sb ${branchJoin} WHERE ${where}`,
        queryParams
    );

    const subjectDetails = await resolveSubjectDetails(rows.flatMap(r => r.subject_ids || []));
    const levelDetails = await resolveLevelDetails(rows.map(r => r.level_id));
    const branchDetails = await resolveBranchDetails(rows.map(r => r.branch_id));

    const data = rows.map(row => ({
        ...row,
        id: String(row.id),
        branch_id: String(row.branch_id),
        level_id: String(row.level_id),
        level_name: levelDetails[row.level_id]?.level_name || null,
        program_id: levelDetails[row.level_id]?.program_id ? String(levelDetails[row.level_id].program_id) : null,
        program_name: levelDetails[row.level_id]?.program_name || null,
        course_id: levelDetails[row.level_id]?.course_id ? String(levelDetails[row.level_id].course_id) : null,
        course_name: levelDetails[row.level_id]?.course_name || null,
        branch_name: branchDetails[row.branch_id] || null,
        fee_amount: row.fee_amount !== null && row.fee_amount !== undefined ? Number(row.fee_amount) : null,
        fee_plan_id: row.fee_plan_id ? String(row.fee_plan_id) : null,
        is_active: !!row.is_active,
        created_by: row.created_by ? String(row.created_by) : null,
        updated_by: row.updated_by ? String(row.updated_by) : null,
        subjects: (row.subject_ids || []).map(id => subjectDetails[id]).filter(Boolean)
    }));

    return { data, total: countRows[0].total };
};

const resolveLevelDetails = async (levelIds = []) => {
    const uniqueIds = [...new Set(levelIds.map(Number).filter(Boolean))];
    if (uniqueIds.length === 0) return {};
    const placeholders = uniqueIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT l.id, l.name AS level_name, p.id AS program_id, p.name AS program_name,
                c.id AS course_id, c.name AS course_name
         FROM levels l
         JOIN programs p ON p.id = l.program_id
         JOIN courses c ON c.id = p.course_id
         WHERE l.id IN (${placeholders})`,
        uniqueIds
    );
    const map = {};
    for (const row of rows) map[row.id] = {
        level_name: row.level_name,
        program_id: row.program_id,
        program_name: row.program_name,
        course_id: row.course_id,
        course_name: row.course_name
    };
    return map;
};

const resolveBranchDetails = async (branchIds = []) => {
    const uniqueIds = [...new Set(branchIds.map(Number).filter(Boolean))];
    if (uniqueIds.length === 0) return {};
    const placeholders = uniqueIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT id, name FROM branches WHERE id IN (${placeholders})`,
        uniqueIds
    );
    const map = {};
    for (const row of rows) map[row.id] = row.name;
    return map;
};

const getBundleById = async (tenantId, id) => {
    const [rows] = await pool.query(
        `${BUNDLE_SELECT} WHERE sb.id = ? AND sb.tenant_id = ? AND sb.deleted_at IS NULL`,
        [id, tenantId]
    );
    if (rows.length === 0) return null;

    const bundle = rows[0];
    const subjectDetails = await resolveSubjectDetails(bundle.subject_ids || []);
    const [levelMap] = await pool.query(
        `SELECT l.id, l.name AS level_name, p.id AS program_id, p.name AS program_name,
                c.id AS course_id, c.name AS course_name
         FROM levels l
         JOIN programs p ON p.id = l.program_id
         JOIN courses c ON c.id = p.course_id
         WHERE l.id = ?`,
        [bundle.level_id]
    );
    const [branchMap] = await pool.query(
        'SELECT id, name FROM branches WHERE id = ?', [bundle.branch_id]
    );

    return {
        ...bundle,
        id: String(bundle.id),
        branch_id: String(bundle.branch_id),
        level_id: String(bundle.level_id),
        level_name: levelMap[0]?.level_name || null,
        program_id: levelMap[0]?.program_id ? String(levelMap[0].program_id) : null,
        program_name: levelMap[0]?.program_name || null,
        course_id: levelMap[0]?.course_id ? String(levelMap[0].course_id) : null,
        course_name: levelMap[0]?.course_name || null,
        branch_name: branchMap[0]?.name || null,
        fee_amount: bundle.fee_amount !== null && bundle.fee_amount !== undefined ? Number(bundle.fee_amount) : null,
        fee_plan_id: bundle.fee_plan_id ? String(bundle.fee_plan_id) : null,
        is_active: !!bundle.is_active,
        created_by: bundle.created_by ? String(bundle.created_by) : null,
        updated_by: bundle.updated_by ? String(bundle.updated_by) : null,
        subjects: (bundle.subject_ids || []).map(id => subjectDetails[id]).filter(Boolean)
    };
};

const resolveSubjectDetails = async (subjectIds = []) => {
    const uniqueIds = [...new Set(subjectIds.map(Number).filter(Boolean))];
    if (uniqueIds.length === 0) return {};

    const placeholders = uniqueIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT id, name, code FROM subjects
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        uniqueIds
    );

    const map = {};
    for (const row of rows) {
        map[row.id] = {
            id: String(row.id),
            name: row.name,
            code: row.code
        };
    }
    return map;
};

/**
 * Create a bundle inside a transaction.
 * Validates that every subjectId is mapped to the given levelId via level_subjects.
 * Stores the validated subject ids as a JSON array on subject_bundles.subject_ids.
 */
const createBundle = async (tenantId, data, userId) => {
    const { levelId, branchId, name, description = '', is_active = true, subjectIds = [], feeAmount = null } = data;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Validate level exists
        const [levelRows] = await conn.query(
            'SELECT id FROM levels WHERE id = ? AND deleted_at IS NULL',
            [levelId]
        );
        if (levelRows.length === 0) throw { code: 'INVALID_LEVEL' };

        // Validate branch exists
        const [branchRows] = await conn.query(
            'SELECT id FROM branches WHERE id = ? AND deleted_at IS NULL',
            [branchId]
        );
        if (branchRows.length === 0) throw { code: 'INVALID_BRANCH' };

        // Validate subjects belong to the level
        const validSubjectIds = await validateSubjectsForLevel(conn, levelId, subjectIds);

        const [result] = await conn.query(
            `INSERT INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, fee_amount, is_active, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, branchId, levelId, name, description, JSON.stringify(validSubjectIds), feeAmount !== null && feeAmount !== undefined ? Number(feeAmount) : null, is_active ? 1 : 0, userId, userId]
        );

        await conn.commit();
        return { id: String(result.insertId) };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const updateBundle = async (tenantId, id, data, userId) => {
    const { levelId, name, description, is_active, subjectIds, feeAmount } = data;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existingRows] = await conn.query(
            'SELECT * FROM subject_bundles WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL',
            [id, tenantId]
        );
        if (existingRows.length === 0) {
            await conn.rollback();
            return null;
        }
        const existing = existingRows[0];
        const targetLevelId = levelId || existing.level_id;

        if (levelId && Number(levelId) !== Number(existing.level_id)) {
            const [levelRows] = await conn.query(
                'SELECT id FROM levels WHERE id = ? AND deleted_at IS NULL',
                [levelId]
            );
            if (levelRows.length === 0) throw { code: 'INVALID_LEVEL' };
        }

        let subjectIdsToStore;
        if (subjectIds !== undefined) {
            subjectIdsToStore = await validateSubjectsForLevel(conn, targetLevelId, subjectIds);
        }

        await conn.query(
            `UPDATE subject_bundles
             SET name = ?, description = ?, subject_ids = ?, fee_amount = ?, is_active = ?, level_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [
                name ?? existing.name,
                description ?? existing.description,
                subjectIdsToStore !== undefined ? JSON.stringify(subjectIdsToStore) : JSON.stringify(existing.subject_ids || []),
                feeAmount !== undefined && feeAmount !== null ? Number(feeAmount) : existing.fee_amount !== null ? Number(existing.fee_amount) : null,
                is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
                targetLevelId,
                userId,
                id,
                tenantId
            ]
        );

        await conn.commit();
        return { id: String(id) };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const deleteBundle = async (tenantId, id, userId) => {
    const [result] = await pool.query(
        `UPDATE subject_bundles
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [userId, id, tenantId]
    );
    return result.affectedRows > 0;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const validateSubjectsForLevel = async (conn, levelId, subjectIds = []) => {
    if (!subjectIds || subjectIds.length === 0) return [];

    const numericIds = [...new Set(subjectIds.map(Number).filter(Boolean))];
    if (numericIds.length === 0) return [];

    const placeholders = numericIds.map(() => '?').join(',');
    const [validRows] = await conn.query(
        `SELECT subject_id FROM level_subjects
         WHERE level_id = ? AND subject_id IN (${placeholders})`,
        [levelId, ...numericIds]
    );
    return validRows.map(r => r.subject_id);
};

module.exports = {
    getBundles,
    getBundleById,
    createBundle,
    updateBundle,
    deleteBundle
};