const pool = require('../config/db');

const findUserByEmail = async (email, tenantId = null) => {
    if (tenantId) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
        return rows;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows;
};

const findUserById = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0];
};

const getUserFullDetails = async (userId) => {
    const [userRows] = await pool.query(
        `SELECT u.id, u.tenant_id, u.name, u.email, u.mobile, u.user_type, u.status, u.app_access_suspended, u.must_change_password, u.last_login_at, u.created_at,
                t.name AS tenant_name, t.slug AS tenant_slug
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = ? AND u.deleted_at IS NULL`,
        [userId]
    );

    if (!userRows || userRows.length === 0) return null;
    const user = userRows[0];

    // Fetch assigned roles
    const [roles] = await pool.query(
        `SELECT r.id, r.name, r.code, r.description, r.is_system, ur.assigned_at
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ? AND ur.revoked_at IS NULL AND r.deleted_at IS NULL`,
        [userId]
    );

    // Fetch permissions grouped per role
    const [rolePermissions] = await pool.query(
        `SELECT r.id AS role_id, r.name AS role_name, r.code AS role_code, p.id AS permission_id, p.module, p.action, p.code AS permission_code, p.description
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = ? AND ur.revoked_at IS NULL AND p.deleted_at IS NULL
         ORDER BY r.name ASC, p.module ASC`,
        [userId]
    );

    // Group permissions by role
    const roleWiseMap = {};
    for (const rp of rolePermissions) {
        if (!roleWiseMap[rp.role_code]) {
            roleWiseMap[rp.role_code] = {
                role_id: rp.role_id,
                role_name: rp.role_name,
                role_code: rp.role_code,
                permissions: []
            };
        }
        roleWiseMap[rp.role_code].permissions.push({
            id: rp.permission_id,
            module: rp.module,
            action: rp.action,
            code: rp.permission_code,
            description: rp.description
        });
    }

    user.assigned_roles = roles;
    user.role_wise_permissions = Object.values(roleWiseMap);

    // Fetch user-specific permission overrides
    const [overrides] = await pool.query(
        `SELECT op.id, op.permission_id, op.override_type, op.created_at,
                p.module, p.action, p.code AS permission_code, p.description
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND p.deleted_at IS NULL
         ORDER BY p.module ASC, p.code ASC`,
        [userId]
    );

    const baseRolePermIds = new Set(rolePermissions.map(rp => rp.permission_id));
    user.overridden_permissions = overrides.map(o => ({
        ...o,
        base_role_status: baseRolePermIds.has(o.permission_id) ? 'Granted' : 'Not Granted',
        effective_status: o.override_type === 'grant' ? 'Granted' : 'Denied'
    }));

    return user;
};

const getUserRoleCodes = async (userId) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT r.code
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ? AND r.is_active = 1 AND r.deleted_at IS NULL`,
        [userId]
    );
    return rows.map(row => row.code);
};

const getUserPermissions = async (userId) => {
    // Flat RBAC: effective permissions = union of the user's role permissions
    // plus explicit 'grant' overrides, minus explicit 'revoke' overrides.
    const [rows] = await pool.query(
        `SELECT DISTINCT p.code
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = ?
         UNION
         SELECT DISTINCT p.code
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND op.override_type = 'grant'`,
        [userId, userId]
    );
    const permissionCodes = rows.map(row => row.code);

    const [revokedRows] = await pool.query(
        `SELECT p.code
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND op.override_type = 'revoke'`,
        [userId]
    );
    const revoked = new Set(revokedRows.map(row => row.code));

    return permissionCodes.filter(code => !revoked.has(code));
};

const updatePassword = async (userId, passwordHash) => {
    const [result] = await pool.query(
        'UPDATE users SET password_hash = ?, must_change_password = 0, password_generated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, userId]
    );
    return result.affectedRows > 0;
};

const updateUserProfile = async (userId, { name, email }) => {
    const [result] = await pool.query(
        'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, email, userId]
    );
    return result.affectedRows > 0;
};

const getUsersList = async ({ page = 1, limit = 10, search = '', status = '', tenantId = '', userType = '' }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let whereClause = 'WHERE u.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
    }

    if (tenantId) {
        whereClause += ' AND u.tenant_id = ?';
        params.push(tenantId);
    }

    if (userType) {
        whereClause += ' AND u.user_type = ?';
        params.push(userType);
    }

    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(
        `SELECT 
            u.id, 
            u.tenant_id, 
            u.name, 
            u.email, 
            u.mobile, 
            u.user_type, 
            u.status, 
            u.app_access_suspended, 
            u.must_change_password, 
            u.last_login_at, 
            u.created_at,
            t.name AS tenant_name,
            t.slug AS tenant_slug,
            r.id AS role_id,
            r.name AS role_name,
            r.code AS role_code
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
        LEFT JOIN roles r ON ur.role_id = r.id
        ${whereClause}
        ORDER BY u.id DESC
        LIMIT ? OFFSET ?`,
        params
    );

    return rows;
};

const getUsersCount = async ({ search = '', status = '', tenantId = '', userType = '' }) => {
    const params = [];
    let whereClause = 'WHERE u.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
    }

    if (tenantId) {
        whereClause += ' AND u.tenant_id = ?';
        params.push(tenantId);
    }

    if (userType) {
        whereClause += ' AND u.user_type = ?';
        params.push(userType);
    }

    const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT u.id) AS total FROM users u ${whereClause}`,
        params
    );

    return rows[0].total;
};

const createUser = async ({ tenant_id, name, email, mobile, password_hash, user_type, status = 'active', role_id, created_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status, must_change_password, password_generated_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)`,
            [tenant_id, name, email, mobile || null, password_hash, user_type, status, created_by || null]
        );

        const newUserId = result.insertId;

        if (role_id) {
            await connection.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
                [newUserId, role_id, created_by || null]
            );
        }

        await connection.commit();
        return newUserId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const assignUserRole = async (userId, roleId, assignedBy) => {
    const [existing] = await pool.query(
        'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
        [userId, roleId]
    );
    if (existing && existing.length > 0) {
        return true;
    }
    await pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
        [userId, roleId, assignedBy || null]
    );
    return true;
};

const updateUser = async (id, { name, email, mobile, user_type, status, app_access_suspended, role_id, updated_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE users 
             SET name = ?, email = ?, mobile = ?, user_type = ?, status = ?, app_access_suspended = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [name, email, mobile || null, user_type, status, app_access_suspended ? 1 : 0, updated_by || null, id]
        );

        if (role_id) {
            // Assign role if not already assigned (supports multi-role per user)
            const [existing] = await connection.query(
                'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
                [id, role_id]
            );
            if (!existing || existing.length === 0) {
                await connection.query(
                    `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
                    [id, role_id, updated_by || null]
                );
            }
        }

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const deleteUser = async (id) => {
    const [result] = await pool.query(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return result.affectedRows > 0;
};

const resetUserPassword = async (id, passwordHash) => {
    const [result] = await pool.query(
        `UPDATE users SET password_hash = ?, must_change_password = 1, password_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [passwordHash, id]
    );
    return result.affectedRows > 0;
};

const getAllRoles = async () => {
    const [rows] = await pool.query('SELECT id, name, code, description FROM roles WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC');
    return rows;
};

const getAllTenants = async () => {
    const [rows] = await pool.query('SELECT id, name, slug, status FROM tenants WHERE deleted_at IS NULL ORDER BY name ASC');
    return rows;
};

const removeUserRole = async (userId, roleId) => {
    const [result] = await pool.query(
        'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
        [userId, roleId]
    );
    return result.affectedRows > 0;
};

const changeUserRole = async (userId, oldRoleId, newRoleId, updatedBy) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
            [userId, oldRoleId]
        );
        const [existing] = await connection.query(
            'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
            [userId, newRoleId]
        );
        if (!existing || existing.length === 0) {
            await connection.query(
                'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
                [userId, newRoleId, updatedBy || null]
            );
        }
        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const addUserPermissionOverride = async ({ user_id, permission_id, override_type, created_by }) => {
    const [result] = await pool.query(
        `INSERT INTO overridden_permissions (user_id, permission_id, override_type, created_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE override_type = VALUES(override_type), updated_at = CURRENT_TIMESTAMP`,
        [user_id, permission_id, override_type, created_by || null]
    );
    return result;
};

const removeUserPermissionOverride = async (userId, overrideId) => {
    const [result] = await pool.query(
        `DELETE FROM overridden_permissions WHERE id = ? AND user_id = ?`,
        [overrideId, userId]
    );
    return result.affectedRows > 0;
};

module.exports = {
    findUserByEmail,
    findUserById,
    getUserFullDetails,
    getUserRoleCodes,
    getUserPermissions,
    updatePassword,
    updateUserProfile,
    getUsersList,
    getUsersCount,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    removeUserRole,
    changeUserRole,
    assignUserRole,
    addUserPermissionOverride,
    removeUserPermissionOverride,
    getAllRoles,
    getAllTenants
};
