const pool = require('../config/db');

const BRANCH_WHERE = `b.tenant_id = ? AND b.deleted_at IS NULL`;

const normalizeStatus = (status) => {
    if (!status) return 'active';
    return String(status).toLowerCase();
};

const formatStatus = (status) => {
    if (!status) return status;
    return String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase();
};

const getBranchIdByIdentifier = async (conn, tenantId, identifier) => {
    const [rows] = await conn.query(
        `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
        [tenantId, identifier, identifier]
    );
    return rows[0] ? rows[0].id : null;
};

const fetchBranchSettings = async (branchId) => {
    const [rows] = await pool.query(
        `SELECT setting_key, setting_value FROM branch_settings WHERE branch_id = ?`,
        [branchId]
    );
    const settings = {};
    for (const row of rows) {
        settings[row.setting_key] = row.setting_value;
    }
    return settings;
};

const extractAdminEmails = (settings) => {
    const altEmails = Array.isArray(settings.alt_emails) ? settings.alt_emails : [];
    const defaultEmail = settings.default_email || '';
    return { altEmails, defaultEmail };
};

const fetchBranchAdmin = async (branchId) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.mobile
         FROM user_branch_access uba
         JOIN users u ON uba.user_id = u.id
         WHERE uba.branch_id = ? AND uba.is_primary = 1 AND uba.revoked_at IS NULL`,
        [branchId]
    );
    return rows[0] || null;
};

const fetchBranchProgramMappings = async (branchId) => {
    const [rows] = await pool.query(
        `SELECT bp.course_id, bp.program_id, c.code AS course_code, c.name AS course_name,
                p.code AS program_code, p.name AS program_name
         FROM branch_programs bp
         JOIN courses c ON bp.course_id = c.id
         JOIN programs p ON bp.program_id = p.id
         WHERE bp.branch_id = ?`,
        [branchId]
    );
    const mappings = [];
    for (const row of rows) {
        mappings.push({
            courseId: String(row.course_id),
            courseCode: row.course_code,
            courseName: row.course_name,
            programId: String(row.program_id),
            programCode: row.program_code,
            programName: row.program_name
        });
    }
    return mappings;
};

const fetchCourseIdsForBranch = async (branchId) => {
    const [rows] = await pool.query(
        `SELECT course_id FROM course_branches WHERE branch_id = ?`,
        [branchId]
    );
    return rows.map(r => r.course_id);
};

const rowToBranch = async (row) => {
    const [admin, settings, programMappings, courseIds] = await Promise.all([
        fetchBranchAdmin(row.id),
        fetchBranchSettings(row.id),
        fetchBranchProgramMappings(row.id),
        fetchCourseIdsForBranch(row.id)
    ]);
    const { altEmails, defaultEmail } = extractAdminEmails(settings);

    return {
        ...row,
        id: String(row.id),
        status: formatStatus(row.status),
        bankDetails: {
            accountName: row.bank_account_name,
            accountNumber: row.bank_account_number,
            ifsc: row.bank_ifsc,
            bankName: row.bank_name
        },
        admin: admin ? admin.name : '',
        adminEmail: admin ? admin.email : '',
        adminMobile: admin ? (admin.mobile || '') : '',
        altEmails,
        defaultEmail,
        programMappings,
        courseIds: courseIds.map(String)
    };
};

const getBranches = async (tenantId, { search = '', status = 'all', limit = 10, offset = 0 } = {}) => {
    let where = BRANCH_WHERE;
    const params = [tenantId];

    if (search) {
        where += ` AND (b.name LIKE ? OR b.code LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }
    if (status && status.toLowerCase() !== 'all') {
        where += ` AND b.status = ?`;
        params.push(status.toLowerCase());
    }

    const [rows] = await pool.query(
        `SELECT b.id, b.name, b.code, b.address_line1, b.city, b.state, b.pincode,
                b.phone, b.email, b.capacity, b.operating_hours, b.status,
                b.bank_account_name, b.bank_account_number, b.bank_ifsc, b.bank_name,
                b.created_at, b.updated_at
         FROM branches b
         WHERE ${where}
         ORDER BY b.name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM branches b WHERE ${where}`,
        params
    );

    const data = [];
    for (const row of rows) {
        data.push(await rowToBranch(row));
    }

    return { data, total: countRows[0].total };
};

const getBranch = async (tenantId, identifier) => {
    const [rows] = await pool.query(
        `SELECT b.*
         FROM branches b
         WHERE b.tenant_id = ? AND b.deleted_at IS NULL AND (b.id = ? OR b.code = ?)`,
        [tenantId, identifier, identifier]
    );
    const row = rows[0];
    if (!row) return null;
    return rowToBranch(row);
};

const resolveCourseIdsByCode = async (conn, tenantId, courseCodes) => {
    const codes = [...new Set((courseCodes || []).filter(Boolean))];
    if (codes.length === 0) return {};
    const [rows] = await conn.query(
        `SELECT id, code FROM courses
         WHERE tenant_id = ? AND code IN (${codes.map(() => '?').join(',')}) AND deleted_at IS NULL`,
        [tenantId, ...codes]
    );
    return Object.fromEntries(rows.map(r => [r.code, r.id]));
};

const syncCourseBranches = async (conn, branchId, tenantId, courseIds = [], programMappings = []) => {
    await conn.query('DELETE FROM course_branches WHERE branch_id = ?', [branchId]);

    const courseIdByCode = await resolveCourseIdsByCode(
        conn, tenantId, (programMappings || []).map(m => m.courseCode)
    );

    const unique = [...new Set([
        ...(courseIds || []).map(Number).filter(Boolean),
        ...(programMappings || []).map(m => Number(m.courseId)).filter(Boolean),
        ...(programMappings || []).map(m => courseIdByCode[m.courseCode]).filter(Boolean)
    ])];
    for (const courseId of unique) {
        await conn.query(
            'INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES (?, ?)',
            [courseId, branchId]
        );
    }
};

const syncBranchPrograms = async (conn, branchId, tenantId, programMappings = []) => {
    await conn.query('DELETE FROM branch_programs WHERE branch_id = ?', [branchId]);

    const courseIdByCode = await resolveCourseIdsByCode(
        conn, tenantId, (programMappings || []).map(m => m.courseCode)
    );

    const inserts = [];
    for (const mapping of programMappings || []) {
        let courseId = Number(mapping.courseId) || null;
        if (!courseId && mapping.courseCode) courseId = courseIdByCode[mapping.courseCode];
        if (!courseId) continue;

        const programIds = [...new Set((mapping.programIds || []).map(Number).filter(Boolean))];
        const programCodes = [...new Set((mapping.programCodes || []).filter(Boolean))];
        if (programCodes.length > 0) {
            const [progRows] = await conn.query(
                `SELECT id FROM programs
                 WHERE tenant_id = ? AND course_id = ? AND code IN (${programCodes.map(() => '?').join(',')}) AND deleted_at IS NULL`,
                [tenantId, courseId, ...programCodes]
            );
            for (const pr of progRows) programIds.push(pr.id);
        }

        for (const programId of [...new Set(programIds)]) {
            inserts.push([tenantId, branchId, courseId, programId]);
        }
    }

    for (const row of inserts) {
        await conn.query(
            `INSERT IGNORE INTO branch_programs (tenant_id, branch_id, course_id, program_id)
             VALUES (?, ?, ?, ?)`,
            row
        );
    }
};

const upsertBranchSettings = async (conn, branchId, tenantId, data) => {
    const settings = [];
    if (data.altEmails !== undefined) {
        settings.push(['alt_emails', JSON.stringify(data.altEmails || [])]);
    }
    if (data.defaultEmail !== undefined) {
        settings.push(['default_email', JSON.stringify(data.defaultEmail || '')]);
    }
    for (const [key, value] of settings) {
        await conn.query(
            `INSERT INTO branch_settings (tenant_id, branch_id, setting_key, setting_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [tenantId, branchId, key, value]
        );
    }
};

const linkOrCreateBranchAdmin = async (conn, tenantId, branchId, data, actingUserId) => {
    const adminName = data.admin;
    const adminEmail = data.adminEmail;
    const adminMobile = data.adminMobile;

    // If only partial admin fields are sent (e.g. just the mobile), update the
    // existing primary admin for this branch rather than leaving it untouched.
    if (!adminName && !adminEmail) {
        const [existingAdmin] = await conn.query(
            `SELECT u.id, u.mobile FROM user_branch_access uba
             JOIN users u ON uba.user_id = u.id
             WHERE uba.branch_id = ? AND uba.is_primary = 1 AND uba.revoked_at IS NULL`,
            [branchId]
        );
        if (existingAdmin[0] && adminMobile) {
            await conn.query(
                `UPDATE users SET mobile = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [adminMobile, actingUserId, existingAdmin[0].id]
            );
        }
        return existingAdmin[0] ? existingAdmin[0].id : null;
    }

    let userId = null;
    let existingUser = null;
    if (adminEmail) {
        const [existing] = await conn.query(
            `SELECT id, name, mobile FROM users WHERE tenant_id = ? AND email = ?`,
            [tenantId, String(adminEmail).toLowerCase()]
        );
        existingUser = existing[0] || null;
        if (existingUser) {
            userId = existingUser.id;
        }
    }

    // Fall back to matching an existing user by mobile before creating a new one.
    if (!userId && adminMobile) {
        const [byMobile] = await conn.query(
            `SELECT id, name, mobile FROM users WHERE tenant_id = ? AND mobile = ?`,
            [tenantId, adminMobile]
        );
        if (byMobile[0]) {
            existingUser = byMobile[0];
            userId = existingUser.id;
        }
    }

    if (!userId) {
        const [insert] = await conn.query(
            `INSERT INTO users (tenant_id, name, email, mobile, user_type, status, must_change_password, created_by, updated_by)
             VALUES (?, ?, ?, ?, 'staff', 'active', 1, ?, ?)`,
            [tenantId, adminName || 'Branch Admin', String(adminEmail || '').toLowerCase(), adminMobile || null, actingUserId, actingUserId]
        );
        userId = insert.insertId;
    } else {
        await conn.query(
            `UPDATE users SET name = ?, mobile = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [adminName || existingUser.name, adminMobile || existingUser.mobile, actingUserId, userId]
        );
    }

    const [existingLink] = await conn.query(
        `SELECT id FROM user_branch_access WHERE user_id = ? AND branch_id = ?`,
        [userId, branchId]
    );

    if (existingLink[0]) {
        await conn.query(
            `UPDATE user_branch_access SET is_primary = 1, revoked_at = NULL, granted_by = ?
             WHERE id = ?`,
            [actingUserId, existingLink[0].id]
        );
    } else {
        await conn.query(
            `INSERT INTO user_branch_access (tenant_id, user_id, branch_id, is_primary, granted_by)
             VALUES (?, ?, ?, 1, ?)`,
            [tenantId, userId, branchId, actingUserId]
        );
    }

    const [roleRows] = await conn.query(`SELECT id FROM roles WHERE code = 'branch_admin'`);
    const roleId = roleRows[0]?.id;
    if (roleId) {
        await conn.query(
            `INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
            [userId, roleId, actingUserId]
        );
    }

    return userId;
};

// Map a DB row (snake_case columns) back into the camelCase shape the frontend
// form and normalizeCreatePayload expect, so update merges preserve untouched fields.
const rowToEditPayload = (row) => {
    const bank = {};
    if (row.bank_account_name !== null && row.bank_account_name !== undefined) bank.accountName = row.bank_account_name;
    if (row.bank_account_number !== null && row.bank_account_number !== undefined) bank.accountNumber = row.bank_account_number;
    if (row.bank_ifsc !== null && row.bank_ifsc !== undefined) bank.ifsc = row.bank_ifsc;
    if (row.bank_name !== null && row.bank_name !== undefined) bank.bankName = row.bank_name;

    return {
        name: row.name,
        code: row.code,
        status: formatStatus(row.status),
        capacity: row.capacity,
        address: row.address_line1,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        phone: row.phone,
        email: row.email,
        operatingHours: row.operating_hours,
        bankDetails: Object.keys(bank).length ? bank : undefined
    };
};

const normalizeCreatePayload = (data) => {
    const bank = data.bankDetails || {};
    const addressLine1 = data.address || data.address_line1 || '';

    const courseIds = (data.courseIds || [])
        .concat((data.programMappings || []).map(m => Number(m.courseId)))
        .filter(Boolean);

    return {
        name: data.name,
        code: data.code,
        status: normalizeStatus(data.status),
        capacity: data.capacity === undefined || data.capacity === null || data.capacity === ''
            ? null
            : Number(data.capacity),
        address_line1: addressLine1,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        phone: data.phone || null,
        email: data.email || null,
        operating_hours: data.operatingHours || null,
        bank_account_name: bank.accountName || null,
        bank_account_number: bank.accountNumber || null,
        bank_ifsc: bank.ifsc || null,
        bank_name: bank.bankName || null,
        courseIds,
        programMappings: data.programMappings || []
    };
};

const createBranch = async (tenantId, data, userId) => {
    const payload = normalizeCreatePayload(data);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [insert] = await conn.query(
            `INSERT INTO branches (
                tenant_id, name, code, address_line1, city, state, pincode,
                phone, email, capacity, operating_hours, status,
                bank_account_name, bank_account_number, bank_ifsc, bank_name,
                created_by, updated_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, payload.name, payload.code, payload.address_line1,
                payload.city, payload.state, payload.pincode, payload.phone,
                payload.email, payload.capacity, payload.operating_hours, payload.status,
                payload.bank_account_name, payload.bank_account_number, payload.bank_ifsc,
                payload.bank_name, userId, userId
            ]
        );
        const branchId = insert.insertId;

        await syncCourseBranches(conn, branchId, tenantId, payload.courseIds, payload.programMappings);
        await syncBranchPrograms(conn, branchId, tenantId, payload.programMappings);
        await upsertBranchSettings(conn, branchId, tenantId, data);
        await linkOrCreateBranchAdmin(conn, tenantId, branchId, data, userId);

        await conn.commit();
        return { id: String(branchId) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const updateBranch = async (tenantId, identifier, data, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, identifier);
        if (!branchId) {
            await conn.rollback();
            return null;
        }

        const current = await (async () => {
            const [rows] = await conn.query(
                `SELECT * FROM branches WHERE id = ? AND deleted_at IS NULL`,
                [branchId]
            );
            return rows[0];
        })();

        const mergedData = { ...rowToEditPayload(current), ...data };
        const payload = normalizeCreatePayload(mergedData);

        await conn.query(
            `UPDATE branches SET
                name = ?, code = ?, address_line1 = ?, city = ?, state = ?, pincode = ?,
                phone = ?, email = ?, capacity = ?, operating_hours = ?, status = ?,
                bank_account_name = ?, bank_account_number = ?, bank_ifsc = ?, bank_name = ?,
                updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                payload.name, payload.code, payload.address_line1,
                payload.city, payload.state, payload.pincode, payload.phone,
                payload.email, payload.capacity, payload.operating_hours, payload.status,
                payload.bank_account_name, payload.bank_account_number, payload.bank_ifsc,
                payload.bank_name, userId, branchId
            ]
        );

        const shouldSyncMappings = data.replaceMappings === true
            || (Array.isArray(data.programMappings) && data.programMappings.length > 0)
            || (Array.isArray(data.courseIds) && data.courseIds.length > 0);

        if (shouldSyncMappings) {
            await syncCourseBranches(conn, branchId, tenantId, payload.courseIds, payload.programMappings);
            await syncBranchPrograms(conn, branchId, tenantId, payload.programMappings);
        }

        if (data.altEmails !== undefined || data.defaultEmail !== undefined) {
            await upsertBranchSettings(conn, branchId, tenantId, data);
        }

        if (data.admin !== undefined || data.adminEmail !== undefined || data.adminMobile !== undefined) {
            await linkOrCreateBranchAdmin(conn, tenantId, branchId, data, userId);
        }

        await conn.commit();
        return { id: String(branchId) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const deleteBranch = async (tenantId, identifier, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, identifier);
        if (!branchId) {
            await conn.rollback();
            return false;
        }

        await conn.query(
            `UPDATE branches SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP,
                updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [userId, branchId]
        );

        await conn.query(
            `UPDATE user_branch_access SET revoked_at = CURRENT_TIMESTAMP
             WHERE branch_id = ? AND revoked_at IS NULL`,
            [branchId]
        );

        await conn.commit();
        return true;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

module.exports = {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch
};