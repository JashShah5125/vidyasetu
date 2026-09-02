const pool = require('../config/db');

const getRolesList = async ({ page = 1, limit = 10, search = '', status = '' }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let whereClause = 'WHERE r.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (r.name LIKE ? OR r.code LIKE ? OR r.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status !== '' && status !== undefined && status !== null) {
        const isActiveVal = status === 'active' || status === '1' || status === 1 ? 1 : 0;
        whereClause += ' AND r.is_active = ?';
        params.push(isActiveVal);
    }

    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(
        `SELECT 
            r.id,
            r.name,
            r.code,
            r.description,
            r.is_system,
            r.is_active,
            r.created_at,
            r.updated_at,
            COUNT(DISTINCT ur.user_id) AS users_count,
            COUNT(DISTINCT rp.permission_id) AS permissions_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.revoked_at IS NULL
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.is_system DESC, r.id ASC
        LIMIT ? OFFSET ?`,
        params
    );

    return rows;
};

const getRolesCount = async ({ search = '', status = '' }) => {
    const params = [];
    let whereClause = 'WHERE r.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (r.name LIKE ? OR r.code LIKE ? OR r.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status !== '' && status !== undefined && status !== null) {
        const isActiveVal = status === 'active' || status === '1' || status === 1 ? 1 : 0;
        whereClause += ' AND r.is_active = ?';
        params.push(isActiveVal);
    }

    const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT r.id) AS total FROM roles r ${whereClause}`,
        params
    );

    return rows[0].total;
};

const getRoleById = async (id) => {
    const [roleRows] = await pool.query(
        'SELECT id, name, code, description, is_system, is_active, created_at, updated_at FROM roles WHERE id = ? AND deleted_at IS NULL',
        [id]
    );

    if (!roleRows || roleRows.length === 0) {
        return null;
    }

    const role = roleRows[0];

    const [permRows] = await pool.query(
        `SELECT p.id, p.module, p.action, p.code, p.description
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.deleted_at IS NULL
         ORDER BY p.module ASC, p.code ASC`,
        [id]
    );

    role.permissions = permRows;
    role.permission_ids = permRows.map(p => p.id);

    return role;
};

const findRoleByCode = async (code) => {
    const [rows] = await pool.query('SELECT * FROM roles WHERE code = ? AND deleted_at IS NULL', [code]);
    return rows[0] || null;
};

const createRole = async ({ name, code, description, is_active = 1, permission_ids = [], created_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO roles (name, code, description, is_system, is_active, created_by)
             VALUES (?, ?, ?, 0, ?, ?)`,
            [name, code, description || null, is_active ? 1 : 0, created_by || null]
        );

        const roleId = result.insertId;

        if (Array.isArray(permission_ids) && permission_ids.length > 0) {
            const values = permission_ids.map(pId => [roleId, pId]);
            await connection.query(
                `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
                [values]
            );
        }

        await connection.commit();
        return roleId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const updateRole = async (id, { name, description, is_active, permission_ids, updated_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [existingRows] = await connection.query('SELECT * FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
        if (!existingRows || existingRows.length === 0) {
            throw new Error('Role not found');
        }

        const existingRole = existingRows[0];

        // Perform update on role fields
        await connection.query(
            `UPDATE roles
             SET name = ?, description = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                name || existingRole.name,
                description !== undefined ? description : existingRole.description,
                is_active !== undefined ? (is_active ? 1 : 0) : existingRole.is_active,
                updated_by || null,
                id
            ]
        );

        // Update permissions matrix if array provided
        if (Array.isArray(permission_ids)) {
            await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

            if (permission_ids.length > 0) {
                const values = permission_ids.map(pId => [id, pId]);
                await connection.query(
                    `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
                    [values]
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

const deleteRole = async (id) => {
    const [rows] = await pool.query('SELECT is_system FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows || rows.length === 0) {
        return { success: false, reason: 'NOT_FOUND' };
    }

    if (rows[0].is_system === 1) {
        return { success: false, reason: 'SYSTEM_ROLE_PROTECTED' };
    }

    const [result] = await pool.query(
        `UPDATE roles SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ?`,
        [id]
    );

    return { success: result.affectedRows > 0, reason: null };
};

const getAllPermissionsGrouped = async () => {
    const [rows] = await pool.query(
        'SELECT id, module, action, code, description FROM permissions WHERE deleted_at IS NULL ORDER BY module ASC, code ASC'
    );

    const grouped = {};
    for (const p of rows) {
        if (!grouped[p.module]) {
            grouped[p.module] = [];
        }
        grouped[p.module].push(p);
    }

    return { raw: rows, grouped };
};

module.exports = {
    getRolesList,
    getRolesCount,
    getRoleById,
    findRoleByCode,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissionsGrouped
};
