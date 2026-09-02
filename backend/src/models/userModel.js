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

module.exports = {
    findUserByEmail,
    findUserById,
    getUserRoleCodes,
    getUserPermissions,
    updatePassword,
    updateUserProfile
};
