const pool = require('../config/db');

const TYPE_TOKENS = ['classroom', 'lab', 'seminar_hall', 'computer_lab'];
const STATUS_TOKENS = ['active', 'inactive', 'under_maintenance', 'deleted'];

const tokenize = (value, tokens, fallback) => {
    if (!value) return fallback;
    const token = String(value).toLowerCase().trim().replace(/\s+/g, '_');
    return tokens.includes(token) ? token : fallback;
};

const normalizeType = (type) => tokenize(type, TYPE_TOKENS, 'classroom');
const normalizeStatus = (status) => tokenize(status, STATUS_TOKENS, 'active');

const titleize = (token) =>
    String(token || '')
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

const rowToClassroom = (row) => ({
    id: String(row.id),
    branchId: String(row.branch_id),
    branchName: row.branch_name || '',
    name: row.name,
    roomNumber: row.room_number || '',
    capacity: Number(row.capacity),
    type: titleize(row.type),
    status: titleize(row.status)
});

const rowToEditPayload = (row) => ({
    branchId: row.branch_id,
    name: row.name,
    roomNumber: row.room_number,
    capacity: row.capacity,
    type: row.type,
    status: row.status
});

const normalizeCreatePayload = (data) => ({
    branchId: Number(data.branch_id ?? data.branchId),
    name: String(data.name || '').trim(),
    roomNumber: String(data.roomNumber ?? data.room_number ?? '').trim(),
    capacity: (data.capacity === undefined || data.capacity === null || data.capacity === '')
        ? null
        : Number(data.capacity),
    type: normalizeType(data.type),
    status: normalizeStatus(data.status)
});

const getBranchIdInTenant = async (conn, tenantId, branchId) => {
    const [rows] = await conn.query(
        `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
        [tenantId, Number(branchId)]
    );
    return rows.length ? rows[0].id : null;
};

const getClassrooms = async (tenantId, { search = '', type = 'all', status = 'all', branch = 'all', limit = 10, offset = 0 } = {}) => {
    let where = 'r.tenant_id = ? AND r.deleted_at IS NULL';
    const params = [tenantId];

    if (search) {
        where += ' AND (r.name LIKE ? OR r.room_number LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }
    if (type && String(type).toLowerCase() !== 'all') {
        where += ' AND r.type = ?';
        params.push(normalizeType(type));
    }
    if (status && String(status).toLowerCase() !== 'all') {
        where += ' AND r.status = ?';
        params.push(normalizeStatus(status));
    }
    if (branch && String(branch).toLowerCase() !== 'all') {
        where += ' AND r.branch_id = ?';
        params.push(Number(branch));
    }

    const [rows] = await pool.query(
        `SELECT r.*, b.name AS branch_name
         FROM classrooms r
         JOIN branches b ON r.branch_id = b.id
         WHERE ${where}
         ORDER BY b.name ASC, r.name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM classrooms r WHERE ${where}`,
        params
    );

    return { data: rows.map(rowToClassroom), total: countRows[0].total };
};

const getClassroom = async (tenantId, id) => {
    const [rows] = await pool.query(
        `SELECT r.*, b.name AS branch_name
         FROM classrooms r
         JOIN branches b ON r.branch_id = b.id
         WHERE r.tenant_id = ? AND r.deleted_at IS NULL AND r.id = ?`,
        [tenantId, Number(id)]
    );
    return rows[0] ? rowToClassroom(rows[0]) : null;
};

const createClassroom = async (tenantId, data, userId) => {
    const payload = normalizeCreatePayload(data);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdInTenant(conn, tenantId, payload.branchId);
        if (!branchId) {
            await conn.rollback();
            const error = new Error('Branch not found for this institute');
            error.code = 'ER_BRANCH_NOT_FOUND';
            throw error;
        }

        const [insert] = await conn.query(
            `INSERT INTO classrooms
                (tenant_id, branch_id, name, room_number, capacity, type, status, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, branchId, payload.name, payload.roomNumber, payload.capacity,
             payload.type, payload.status, userId, userId]
        );

        await conn.commit();
        return { id: String(insert.insertId) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const updateClassroom = async (tenantId, id, data, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existingRows] = await conn.query(
            `SELECT * FROM classrooms
             WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
            [tenantId, Number(id)]
        );
        if (!existingRows.length) {
            await conn.rollback();
            return null;
        }
        const current = existingRows[0];

        const payload = normalizeCreatePayload({ ...rowToEditPayload(current), ...data });

        const branchId = await getBranchIdInTenant(conn, tenantId, payload.branchId);
        if (!branchId) {
            await conn.rollback();
            const error = new Error('Branch not found for this institute');
            error.code = 'ER_BRANCH_NOT_FOUND';
            throw error;
        }

        await conn.query(
            `UPDATE classrooms
             SET branch_id = ?, name = ?, room_number = ?, capacity = ?, type = ?, status = ?,
                 updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [branchId, payload.name, payload.roomNumber, payload.capacity,
             payload.type, payload.status, userId, current.id]
        );

        await conn.commit();
        return { id: String(current.id) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const deleteClassroom = async (tenantId, id, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `UPDATE classrooms
             SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP,
                 updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
            [userId, tenantId, Number(id)]
        );
        if (result.affectedRows === 0) {
            await conn.rollback();
            return false;
        }

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
    getClassrooms,
    getClassroom,
    createClassroom,
    updateClassroom,
    deleteClassroom
};