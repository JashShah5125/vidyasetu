const pool = require('../config/db');
const bcrypt = require('bcryptjs');

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
        let val = row.setting_value;
        if (typeof val === 'string') {
            try {
                val = JSON.parse(val);
            } catch {
                // keep raw string if not json
            }
        }
        settings[row.setting_key] = val;
    }
    return settings;
};

const extractAdminEmails = (settings) => {
    let altEmails = [];
    if (Array.isArray(settings.alt_emails)) {
        altEmails = settings.alt_emails;
    } else if (typeof settings.alt_emails === 'string') {
        try {
            const parsed = JSON.parse(settings.alt_emails);
            if (Array.isArray(parsed)) altEmails = parsed;
        } catch {}
    }
    let defaultEmail = settings.default_email || '';
    if (typeof defaultEmail === 'string' && defaultEmail.startsWith('"') && defaultEmail.endsWith('"')) {
        try {
            defaultEmail = JSON.parse(defaultEmail);
        } catch {}
    }
    return { altEmails, defaultEmail: String(defaultEmail || '') };
};

const fetchBranchAdmin = async (branchId) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.mobile
         FROM user_branch_access uba
         JOIN users u ON uba.user_id = u.id
         WHERE uba.branch_id = ? AND uba.is_primary = 1 AND uba.revoked_at IS NULL
         ORDER BY uba.id DESC`,
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
    const adminName = data.admin !== undefined ? (String(data.admin).trim() || null) : undefined;
    const adminEmail = data.adminEmail !== undefined ? (String(data.adminEmail).trim().toLowerCase() || null) : undefined;
    const adminMobile = data.adminMobile !== undefined ? (String(data.adminMobile).trim() || null) : undefined;

    // If no admin fields provided at all in data
    if (adminName === undefined && adminEmail === undefined && adminMobile === undefined) {
        return null;
    }

    // Find the current active primary admin for this branch
    const [currentPrimary] = await conn.query(
        `SELECT u.id, u.name, u.email, u.mobile
         FROM user_branch_access uba
         JOIN users u ON uba.user_id = u.id
         WHERE uba.branch_id = ? AND uba.is_primary = 1 AND uba.revoked_at IS NULL
         ORDER BY uba.id DESC
         LIMIT 1`,
        [branchId]
    );
    const existingBranchAdmin = currentPrimary[0] || null;

    // If all admin fields are empty (clearing the branch admin)
    if (!adminName && !adminEmail && !adminMobile) {
        if (existingBranchAdmin) {
            await conn.query(
                `UPDATE user_branch_access SET is_primary = 0, revoked_at = CURRENT_TIMESTAMP
                 WHERE branch_id = ?`,
                [branchId]
            );
        }
        return null;
    }

    let targetUserId = null;

    if (adminEmail) {
        // Check if an existing user has this email
        const [existingByEmail] = await conn.query(
            `SELECT id, name, email, mobile FROM users WHERE tenant_id = ? AND email = ?`,
            [tenantId, adminEmail]
        );

        if (existingByEmail[0]) {
            // Reassign to the existing user who owns this email
            targetUserId = existingByEmail[0].id;
        } else if (existingBranchAdmin) {
            // Change the email of the existing branch admin
            targetUserId = existingBranchAdmin.id;
            await conn.query(
                `UPDATE users SET
                    email = ?,
                    updated_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [adminEmail, actingUserId, targetUserId]
            );
        } else {
            // Create a brand new admin user
            const defaultPasswordHash = await bcrypt.hash('admin123', 10);
            
            // Check if mobile is already used by someone else
            let safeMobile = adminMobile;
            if (safeMobile) {
                const [dupMob] = await conn.query(
                    `SELECT id FROM users WHERE tenant_id = ? AND mobile = ?`,
                    [tenantId, safeMobile]
                );
                if (dupMob[0]) safeMobile = null;
            }

            const [insert] = await conn.query(
                `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status, must_change_password, password_generated_at, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, 'staff', 'active', 1, CURRENT_TIMESTAMP, ?, ?)`,
                [tenantId, adminName || 'Branch Admin', adminEmail, safeMobile, defaultPasswordHash, actingUserId, actingUserId]
            );
            targetUserId = insert.insertId;
        }
    } else if (existingBranchAdmin) {
        targetUserId = existingBranchAdmin.id;
    } else if (adminMobile || adminName) {
        if (adminMobile) {
            const [byMobile] = await conn.query(
                `SELECT id, name, email, mobile FROM users WHERE tenant_id = ? AND mobile = ?`,
                [tenantId, adminMobile]
            );
            if (byMobile[0]) {
                targetUserId = byMobile[0].id;
            }
        }
        if (!targetUserId) {
            const defaultPasswordHash = await bcrypt.hash('admin123', 10);
            const generatedEmail = `branchadmin_${branchId}_${Date.now()}@vidyasetu.com`;
            let safeMobile = adminMobile;
            if (safeMobile) {
                const [dupMob] = await conn.query(
                    `SELECT id FROM users WHERE tenant_id = ? AND mobile = ?`,
                    [tenantId, safeMobile]
                );
                if (dupMob[0]) safeMobile = null;
            }
            const [insert] = await conn.query(
                `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status, must_change_password, password_generated_at, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, 'staff', 'active', 1, CURRENT_TIMESTAMP, ?, ?)`,
                [tenantId, adminName || 'Branch Admin', generatedEmail, safeMobile, defaultPasswordHash, actingUserId, actingUserId]
            );
            targetUserId = insert.insertId;
        }
    }

    if (!targetUserId) {
        return null;
    }

    // Now safely update name and mobile on targetUserId if provided and not duplicate
    if (adminName !== undefined || adminMobile !== undefined) {
        let safeMobile = undefined;
        if (adminMobile !== undefined) {
            if (adminMobile) {
                const [dupMob] = await conn.query(
                    `SELECT id FROM users WHERE tenant_id = ? AND mobile = ? AND id != ?`,
                    [tenantId, adminMobile, targetUserId]
                );
                if (!dupMob[0]) {
                    safeMobile = adminMobile;
                }
            } else {
                safeMobile = null;
            }
        }

        const updateFields = [];
        const updateParams = [];
        if (adminName) {
            updateFields.push('name = ?');
            updateParams.push(adminName);
        }
        if (safeMobile !== undefined) {
            updateFields.push('mobile = ?');
            updateParams.push(safeMobile);
        }
        if (updateFields.length > 0) {
            updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
            updateParams.push(actingUserId, targetUserId);
            await conn.query(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateParams
            );
        }
    }

    // Demote any other users as primary on this branch
    await conn.query(
        `UPDATE user_branch_access SET is_primary = 0
         WHERE branch_id = ? AND user_id != ?`,
        [branchId, targetUserId]
    );

    // Link target user to branch as primary
    const [existingLink] = await conn.query(
        `SELECT id FROM user_branch_access WHERE user_id = ? AND branch_id = ?`,
        [targetUserId, branchId]
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
            [tenantId, targetUserId, branchId, actingUserId]
        );
    }

    // Ensure branch_admin role is assigned
    const [roleRows] = await conn.query(
        `SELECT id FROM roles WHERE code IN ('branch_admin', 'branch-admin') OR name IN ('Branch Admin', 'branch-admin') LIMIT 1`
    );
    const roleId = roleRows[0]?.id;
    if (roleId) {
        await conn.query(
            `INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
            [targetUserId, roleId, actingUserId]
        );
    }

    return targetUserId;
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

const verifyUserBranchAccess = async (tenantId, userId, identifier) => {
    const [rows] = await pool.query(
        `SELECT uba.id
         FROM user_branch_access uba
         JOIN branches b ON uba.branch_id = b.id
         WHERE b.tenant_id = ? AND uba.user_id = ? AND uba.revoked_at IS NULL AND (b.id = ? OR b.code = ?)`,
        [tenantId, userId, identifier, identifier]
    );
    return rows.length > 0;
};

const getUserBranchIds = async (tenantId, userId) => {
    const [rows] = await pool.query(
        `SELECT uba.branch_id
         FROM user_branch_access uba
         JOIN branches b ON uba.branch_id = b.id
         WHERE b.tenant_id = ? AND uba.user_id = ? AND uba.revoked_at IS NULL AND b.deleted_at IS NULL
         ORDER BY uba.is_primary DESC, uba.id ASC`,
        [tenantId, userId]
    );
    return rows.map(r => Number(r.branch_id));
};

const getBranchCourses = async (tenantId, branchIdentifier, { assignment_status = 'all', search = '' } = {}) => {
    const [branchRows] = await pool.query(
        `SELECT id, name, code FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
        [tenantId, branchIdentifier, branchIdentifier]
    );
    if (!branchRows[0]) return { data: [], total: 0, branch: null };
    const branch = branchRows[0];
    const branchId = branch.id;

    let where = `c.tenant_id = ? AND c.deleted_at IS NULL`;
    const params = [tenantId];

    if (search) {
        where += ` AND (c.name LIKE ? OR c.code LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }

    if (assignment_status === 'assigned') {
        where += ` AND cb.course_id IS NOT NULL`;
    } else if (assignment_status === 'unassigned') {
        where += ` AND cb.course_id IS NULL`;
    }

    const [rows] = await pool.query(
        `SELECT
            c.id,
            c.name,
            c.code,
            c.description,
            c.is_active,
            CASE
                WHEN cb.course_id IS NOT NULL THEN 'assigned'
                ELSE 'unassigned'
            END AS assignment_status
         FROM courses c
         LEFT JOIN course_branches cb ON cb.course_id = c.id AND cb.branch_id = ?
         WHERE ${where}
         ORDER BY c.name ASC`,
        [branchId, ...params]
    );

    if (rows.length === 0) {
        return { data: [], total: 0, branch };
    }

    const courseIds = rows.map(r => r.id);
    const placeholders = courseIds.map(() => '?').join(',');

    // Fetch all programs for these courses
    const [programRows] = await pool.query(
        `SELECT p.id, p.course_id, p.name, p.code, p.is_active
         FROM programs p
         WHERE p.course_id IN (${placeholders}) AND p.deleted_at IS NULL
         ORDER BY p.name ASC`,
        courseIds
    );

    // Fetch mapped programs for this branch
    const [mappedProgRows] = await pool.query(
        `SELECT bp.course_id, bp.program_id
         FROM branch_programs bp
         WHERE bp.branch_id = ? AND bp.course_id IN (${placeholders})`,
        [branchId, ...courseIds]
    );

    const mappedProgSet = new Set(mappedProgRows.map(m => `${m.course_id}-${m.program_id}`));

    const programsByCourse = {};
    for (const pr of programRows) {
        if (!programsByCourse[pr.course_id]) programsByCourse[pr.course_id] = [];
        const isAssigned = mappedProgSet.has(`${pr.course_id}-${pr.id}`);
        programsByCourse[pr.course_id].push({
            id: String(pr.id),
            name: pr.name,
            code: pr.code,
            is_active: Boolean(pr.is_active),
            is_assigned: isAssigned,
            assigned: isAssigned
        });
    }

    const data = rows.map(row => {
        const allProgs = programsByCourse[row.id] || [];
        const isAssigned = row.assignment_status === 'assigned';
        const assignedProgs = allProgs.filter(p => p.is_assigned);
        return {
            id: String(row.id),
            name: row.name,
            code: row.code,
            description: row.description,
            is_active: Boolean(row.is_active),
            is_assigned: isAssigned,
            assignment_status: row.assignment_status,
            programs: allProgs,
            assigned_programs: assignedProgs
        };
    });

    return { data, total: data.length, branch };
};

const assignCourseToBranch = async (tenantId, branchIdentifier, courseIdentifier, programIds = [], userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, branchIdentifier);
        if (!branchId) throw new Error('Branch not found');

        const [courseRows] = await conn.query(
            `SELECT id FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
            [tenantId, courseIdentifier, courseIdentifier]
        );
        if (!courseRows[0]) throw new Error('Course not found');
        const courseId = courseRows[0].id;

        // 1. Insert course branch mapping
        await conn.query(
            `INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES (?, ?)`,
            [courseId, branchId]
        );

        // 2. Map programs
        let targetProgramIds = [];
        if (Array.isArray(programIds) && programIds.length > 0) {
            targetProgramIds = programIds.map(Number).filter(Boolean);
        } else {
            const [progs] = await conn.query(
                `SELECT id FROM programs WHERE course_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [courseId, tenantId]
            );
            targetProgramIds = progs.map(p => p.id);
        }

        for (const progId of targetProgramIds) {
            await conn.query(
                `INSERT IGNORE INTO branch_programs (tenant_id, branch_id, course_id, program_id) VALUES (?, ?, ?, ?)`,
                [tenantId, branchId, courseId, progId]
            );
        }

        await conn.commit();
        return { success: true, branchId, courseId };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const unassignCourseFromBranch = async (tenantId, branchIdentifier, courseIdentifier, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, branchIdentifier);
        if (!branchId) throw new Error('Branch not found');

        const [courseRows] = await conn.query(
            `SELECT id FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
            [tenantId, courseIdentifier, courseIdentifier]
        );
        if (!courseRows[0]) throw new Error('Course not found');
        const courseId = courseRows[0].id;

        await conn.query(
            `DELETE FROM course_branches WHERE course_id = ? AND branch_id = ?`,
            [courseId, branchId]
        );

        await conn.query(
            `DELETE FROM branch_programs WHERE course_id = ? AND branch_id = ?`,
            [courseId, branchId]
        );

        await conn.commit();
        return { success: true, branchId, courseId };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const batchAssignCoursesToBranch = async (tenantId, branchIdentifier, assignments = [], userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, branchIdentifier);
        if (!branchId) throw new Error('Branch not found');

        for (const item of assignments) {
            const courseIdentifier = typeof item === 'object' ? item.courseId : item;
            const programIds = typeof item === 'object' && Array.isArray(item.programIds) ? item.programIds : [];

            const [courseRows] = await conn.query(
                `SELECT id FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
                [tenantId, courseIdentifier, courseIdentifier]
            );
            if (!courseRows[0]) continue;
            const courseId = courseRows[0].id;

            await conn.query(
                `INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES (?, ?)`,
                [courseId, branchId]
            );

            let targetProgramIds = programIds.map(Number).filter(Boolean);
            if (targetProgramIds.length === 0) {
                const [progs] = await conn.query(
                    `SELECT id FROM programs WHERE course_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                    [courseId, tenantId]
                );
                targetProgramIds = progs.map(p => p.id);
            }

            for (const progId of targetProgramIds) {
                await conn.query(
                    `INSERT IGNORE INTO branch_programs (tenant_id, branch_id, course_id, program_id) VALUES (?, ?, ?, ?)`,
                    [tenantId, branchId, courseId, progId]
                );
            }
        }

        await conn.commit();
        return { success: true, branchId };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const toggleBranchProgramAssignment = async (tenantId, branchIdentifier, programId, assign = true, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdByIdentifier(conn, tenantId, branchIdentifier);
        if (!branchId) throw new Error('Branch not found');

        const [progRows] = await conn.query(
            `SELECT id, course_id FROM programs WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [programId, tenantId]
        );
        if (!progRows[0]) throw new Error('Program not found');
        const courseId = progRows[0].course_id;

        if (assign) {
            await conn.query(
                `INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES (?, ?)`,
                [courseId, branchId]
            );
            await conn.query(
                `INSERT IGNORE INTO branch_programs (tenant_id, branch_id, course_id, program_id) VALUES (?, ?, ?, ?)`,
                [tenantId, branchId, courseId, programId]
            );
        } else {
            await conn.query(
                `DELETE FROM branch_programs WHERE branch_id = ? AND program_id = ?`,
                [branchId, programId]
            );
            // Check if any other programs remain for this course on the branch
            const [rem] = await conn.query(
                `SELECT id FROM branch_programs WHERE branch_id = ? AND course_id = ?`,
                [branchId, courseId]
            );
            if (rem.length === 0) {
                await conn.query(
                    `DELETE FROM course_branches WHERE branch_id = ? AND course_id = ?`,
                    [branchId, courseId]
                );
            }
        }

        await conn.commit();
        return { success: true, branchId, courseId, programId, assign };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

module.exports = {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch,
    verifyUserBranchAccess,
    getUserBranchIds,
    getBranchCourses,
    assignCourseToBranch,
    unassignCourseFromBranch,
    batchAssignCoursesToBranch,
    toggleBranchProgramAssignment
};