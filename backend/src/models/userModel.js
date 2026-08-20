const pool = require('../config/db');

const findUserByEmail = async (email, tenantId = null) => {
    if (tenantId) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
        return rows;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows;
};

const getUserPermissions = async (userId, tenantId) => {
    // We only call this for normal users, NOT the SaaS admin.
    const query = `
        SELECT DISTINCT p.code
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ? AND ur.tenant_id = ?
    `;
    const [rows] = await pool.query(query, [userId, tenantId]);
    return rows.map(row => row.code);
};

module.exports = {
    findUserByEmail,
    getUserPermissions
};
