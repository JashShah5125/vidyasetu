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
    status: titleize(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const getBranchIdInTenant = async (conn, tenantId, branchIdentifier) => {
    const [rows] = await conn.query(
        `SELECT id, name, code FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND (id = ? OR code = ?)`,
        [tenantId, branchIdentifier, branchIdentifier]
    );
    return rows.length ? rows[0].id : null;
};

const getClassrooms = async (tenantId, { branchId = 'all', search = '', type = 'all', status = 'all', limit = 10, offset = 0 } = {}) => {
    let where = 'r.tenant_id = ? AND r.deleted_at IS NULL';
    const params = [tenantId];

    if (branchId && String(branchId).toLowerCase() !== 'all') {
        where += ' AND (r.branch_id = ? OR b.code = ?)';
        params.push(branchId, branchId);
    }
    if (search && String(search).trim()) {
        where += ' AND (r.name LIKE ? OR r.room_number LIKE ?)';
        const pattern = `%${String(search).trim()}%`;
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
        `SELECT COUNT(*) AS total 
         FROM classrooms r 
         JOIN branches b ON r.branch_id = b.id
         WHERE ${where}`,
        params
    );

    return { data: rows.map(rowToClassroom), total: countRows[0].total };
};

const getClassroom = async (tenantId, branchId, id) => {
    let query = `
        SELECT r.*, b.name AS branch_name
        FROM classrooms r
        JOIN branches b ON r.branch_id = b.id
        WHERE r.tenant_id = ? AND r.deleted_at IS NULL AND r.id = ?
    `;
    const params = [tenantId, Number(id)];

    if (branchId && String(branchId).toLowerCase() !== 'all') {
        query += ' AND (r.branch_id = ? OR b.code = ?)';
        params.push(branchId, branchId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0] ? rowToClassroom(rows[0]) : null;
};

const createClassroom = async (tenantId, branchIdentifier, data, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchIdInTenant(conn, tenantId, branchIdentifier || data.branchId);
        if (!branchId) {
            await conn.rollback();
            const error = new Error('Branch not found for this institute');
            error.code = 'ER_BRANCH_NOT_FOUND';
            throw error;
        }

        const name = String(data.name || '').trim();
        const roomNumber = String(data.roomNumber ?? data.room_number ?? '').trim() || null;
        const capacity = Number(data.capacity);
        const type = normalizeType(data.type);
        const status = normalizeStatus(data.status);

        if (!name) {
            await conn.rollback();
            const err = new Error('Classroom name is required');
            err.code = 'ER_INVALID_INPUT';
            throw err;
        }

        if (isNaN(capacity) || capacity <= 0 || capacity > 1000) {
            await conn.rollback();
            const err = new Error('Classroom capacity must be between 1 and 1000');
            err.code = 'ER_INVALID_INPUT';
            throw err;
        }

        // Check for duplicate room number or name within this branch
        if (roomNumber) {
            const [dups] = await conn.query(
                `SELECT id FROM classrooms 
                 WHERE tenant_id = ? AND branch_id = ? AND room_number = ? AND deleted_at IS NULL`,
                [tenantId, branchId, roomNumber]
            );
            if (dups.length > 0) {
                await conn.rollback();
                const err = new Error(`A classroom with room number "${roomNumber}" already exists in this branch`);
                err.code = 'ER_DUP_ENTRY';
                throw err;
            }
        }

        const [insert] = await conn.query(
            `INSERT INTO classrooms
                (tenant_id, branch_id, name, room_number, capacity, type, status, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, branchId, name, roomNumber, capacity, type, status, userId, userId]
        );

        await conn.commit();
        return {
            id: String(insert.insertId),
            branchId: String(branchId),
            name,
            roomNumber: roomNumber || '',
            capacity,
            type: titleize(type),
            status: titleize(status)
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const updateClassroom = async (tenantId, branchIdentifier, id, data, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Ensure classroom belongs to tenant and authorized branch
        let findQuery = `
            SELECT r.*, b.code as branch_code 
            FROM classrooms r
            JOIN branches b ON r.branch_id = b.id
            WHERE r.tenant_id = ? AND r.deleted_at IS NULL AND r.id = ?
        `;
        const findParams = [tenantId, Number(id)];

        if (branchIdentifier && String(branchIdentifier).toLowerCase() !== 'all') {
            findQuery += ' AND (r.branch_id = ? OR b.code = ?)';
            findParams.push(branchIdentifier, branchIdentifier);
        }

        const [existingRows] = await conn.query(findQuery, findParams);
        if (!existingRows.length) {
            await conn.rollback();
            return null;
        }

        const current = existingRows[0];
        const branchId = current.branch_id; // branch_id cannot be changed

        const name = data.name !== undefined ? String(data.name).trim() : current.name;
        const roomNumber = data.roomNumber !== undefined || data.room_number !== undefined
            ? (String(data.roomNumber ?? data.room_number ?? '').trim() || null)
            : current.room_number;
        const capacity = data.capacity !== undefined ? Number(data.capacity) : current.capacity;
        const type = data.type !== undefined ? normalizeType(data.type) : current.type;
        const status = data.status !== undefined ? normalizeStatus(data.status) : current.status;

        if (!name) {
            await conn.rollback();
            const err = new Error('Classroom name is required');
            err.code = 'ER_INVALID_INPUT';
            throw err;
        }

        if (isNaN(capacity) || capacity <= 0 || capacity > 1000) {
            await conn.rollback();
            const err = new Error('Classroom capacity must be between 1 and 1000');
            err.code = 'ER_INVALID_INPUT';
            throw err;
        }

        // Duplicate room number check in same branch
        if (roomNumber) {
            const [dups] = await conn.query(
                `SELECT id FROM classrooms 
                 WHERE tenant_id = ? AND branch_id = ? AND room_number = ? AND id != ? AND deleted_at IS NULL`,
                [tenantId, branchId, roomNumber, current.id]
            );
            if (dups.length > 0) {
                await conn.rollback();
                const err = new Error(`A classroom with room number "${roomNumber}" already exists in this branch`);
                err.code = 'ER_DUP_ENTRY';
                throw err;
            }
        }

        await conn.query(
            `UPDATE classrooms
             SET name = ?, room_number = ?, capacity = ?, type = ?, status = ?,
                 updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [name, roomNumber, capacity, type, status, userId, current.id]
        );

        await conn.commit();
        return {
            id: String(current.id),
            branchId: String(branchId),
            name,
            roomNumber: roomNumber || '',
            capacity,
            type: titleize(type),
            status: titleize(status)
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const changeClassroomStatus = async (tenantId, branchIdentifier, id, status, userId) => {
    const normStatus = normalizeStatus(status);
    return updateClassroom(tenantId, branchIdentifier, id, { status: normStatus }, userId);
};

const deleteClassroom = async (tenantId, branchIdentifier, id, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let findQuery = `
            SELECT r.*, b.code as branch_code 
            FROM classrooms r
            JOIN branches b ON r.branch_id = b.id
            WHERE r.tenant_id = ? AND r.deleted_at IS NULL AND r.id = ?
        `;
        const findParams = [tenantId, Number(id)];

        if (branchIdentifier && String(branchIdentifier).toLowerCase() !== 'all') {
            findQuery += ' AND (r.branch_id = ? OR b.code = ?)';
            findParams.push(branchIdentifier, branchIdentifier);
        }

        const [existingRows] = await conn.query(findQuery, findParams);
        if (!existingRows.length) {
            await conn.rollback();
            return false;
        }
        const current = existingRows[0];

        // Dependency check: Active Batches referencing this classroom
        const [activeBatches] = await conn.query(
            `SELECT id, name FROM batches 
             WHERE classroom_id = ? AND tenant_id = ? AND deleted_at IS NULL AND status != 2 LIMIT 1`,
            [current.id, tenantId]
        );
        if (activeBatches.length > 0) {
            await conn.rollback();
            const err = new Error(`Cannot delete classroom "${current.name}". It is currently assigned to active batch "${activeBatches[0].name}". Please unassign it first or deactivate the classroom.`);
            err.code = 'ER_CLASSROOM_HAS_DEPENDENCIES';
            throw err;
        }

        // Dependency check: Scheduled / Future Lectures referencing this classroom
        const [scheduledLectures] = await conn.query(
            `SELECT id FROM lectures 
             WHERE classroom_id = ? AND tenant_id = ? AND deleted_at IS NULL 
               AND (lecture_date >= CURDATE() OR status IN ('scheduled', 'in_progress')) LIMIT 1`,
            [current.id, tenantId]
        );
        if (scheduledLectures.length > 0) {
            await conn.rollback();
            const err = new Error(`Cannot delete classroom "${current.name}". It is assigned to scheduled lectures. Please remove or reassign the lectures first, or mark the room as under maintenance.`);
            err.code = 'ER_CLASSROOM_HAS_DEPENDENCIES';
            throw err;
        }

        const [result] = await conn.query(
            `UPDATE classrooms
             SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP,
                 updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
            [userId, tenantId, current.id]
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
    changeClassroomStatus,
    deleteClassroom
};