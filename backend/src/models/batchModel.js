const pool = require('../config/db');

const STATUS_TOKENS = ['active', 'inactive', 'deleted'];

const normalizeStatus = (status) => {
    if (!status) return 'active';
    const token = String(status).toLowerCase().trim().replace(/\s+/g, '_');
    return STATUS_TOKENS.includes(token) ? token : 'active';
};

const titleize = (token) =>
    String(token || '')
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

const timeToHHMM = (time) => (time ? String(time).substring(0, 5) : '');

const rowToBatch = (row) => ({
    id: String(row.id),
    branchId: String(row.branch_id),
    branchName: row.branch_name || '',
    academicYearId: String(row.academic_year_id),
    academicYearName: row.academic_year_name || '',
    levelId: String(row.level_id),
    levelName: row.level_name || '',
    courseId: row.course_id ? String(row.course_id) : '',
    courseName: row.course_name || '',
    programId: row.program_id ? String(row.program_id) : '',
    programName: row.program_name || '',
    name: row.name,
    code: row.code || '',
    capacity: row.capacity === null || row.capacity === undefined ? null : Number(row.capacity),
    currentStrength: Number(row.current_strength || 0),
    startTime: timeToHHMM(row.start_time),
    endTime: timeToHHMM(row.end_time),
    classroomId: row.classroom_id ? String(row.classroom_id) : '',
    classroomName: row.classroom_name || '',
    status: titleize(row.status)
});

const safeNumber = (value) =>
    (value === undefined || value === null || value === '') ? null : Number(value);

const normalizeCreatePayload = (data) => ({
    name: String(data.name || '').trim(),
    code: data.code ? String(data.code).trim() : '',
    branchId: Number(data.branch_id ?? data.branchId),
    academicYearId: Number(data.academic_year_id ?? data.academicYearId),
    levelId: Number(data.level_id ?? data.levelId),
    capacity: safeNumber(data.capacity),
    startTime: data.startTime ?? data.start_time ?? '',
    endTime: data.endTime ?? data.end_time ?? '',
    classroomId: safeNumber(data.classroom_id ?? data.classroomId),
    status: normalizeStatus(data.status)
});

const rowToEditPayload = (row) => ({
    name: row.name,
    code: row.code,
    branchId: row.branch_id,
    academicYearId: row.academic_year_id,
    levelId: row.level_id,
    capacity: row.capacity,
    startTime: timeToHHMM(row.start_time),
    endTime: timeToHHMM(row.end_time),
    classroomId: row.classroom_id,
    status: row.status
});

const getBranchIdInTenant = async (conn, tenantId, branchId) => {
    const [rows] = await conn.query(
        `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
        [tenantId, Number(branchId)]
    );
    return rows.length ? rows[0].id : null;
};

const getAcademicYearInBranch = async (conn, tenantId, branchId, academicYearId) => {
    const [rows] = await conn.query(
        `SELECT id, name FROM academic_years
         WHERE tenant_id = ? AND deleted_at IS NULL AND branch_id = ? AND id = ?`,
        [tenantId, Number(branchId), Number(academicYearId)]
    );
    return rows.length ? rows[0] : null;
};

const getLevelInTenant = async (conn, tenantId, levelId) => {
    const [rows] = await conn.query(
        `SELECT id FROM levels WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
        [tenantId, Number(levelId)]
    );
    return rows.length ? rows[0].id : null;
};

const getClassroomInBranch = async (conn, tenantId, branchId, classroomId) => {
    const [rows] = await conn.query(
        `SELECT id FROM classrooms
         WHERE tenant_id = ? AND deleted_at IS NULL AND branch_id = ? AND id = ?`,
        [tenantId, Number(branchId), Number(classroomId)]
    );
    return rows.length ? rows[0].id : null;
};

const buildBatchQuery = (tenantId, { search = '', branch = 'all', status = 'all', course = 'all', program = 'all', level = 'all', academicYear = 'all' } = {}) => {
    let where = 'bt.tenant_id = ? AND bt.deleted_at IS NULL';
    const params = [tenantId];

    if (search) {
        where += ' AND (bt.name LIKE ? OR bt.code LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }
    if (branch && String(branch).toLowerCase() !== 'all') {
        where += ' AND bt.branch_id = ?';
        params.push(Number(branch));
    }
    if (status && String(status).toLowerCase() !== 'all') {
        where += ' AND bt.status = ?';
        params.push(normalizeStatus(status));
    }
    if (course && String(course).toLowerCase() !== 'all') {
        where += ' AND lv.course_id = ?';
        params.push(Number(course));
    }
    if (program && String(program).toLowerCase() !== 'all') {
        where += ' AND lv.program_id = ?';
        params.push(Number(program));
    }
    if (level && String(level).toLowerCase() !== 'all') {
        where += ' AND bt.level_id = ?';
        params.push(Number(level));
    }
    if (academicYear && String(academicYear).toLowerCase() !== 'all') {
        where += ' AND bt.academic_year_id = ?';
        params.push(Number(academicYear));
    }

    return { where, params };
};

const BATCH_SELECT = `
    SELECT bt.*,
           b.name AS branch_name,
           ay.name AS academic_year_name,
           lv.name AS level_name,
           lv.course_id, lv.program_id,
           c.name AS course_name,
           p.name AS program_name,
           cr.name AS classroom_name
    FROM batches bt
    JOIN branches b ON bt.branch_id = b.id
    JOIN academic_years ay ON bt.academic_year_id = ay.id
    JOIN levels lv ON bt.level_id = lv.id
    LEFT JOIN courses c ON lv.course_id = c.id
    LEFT JOIN programs p ON lv.program_id = p.id
    LEFT JOIN classrooms cr ON bt.classroom_id = cr.id
`;

const getBatches = async (tenantId, { search = '', branch = 'all', status = 'all', course = 'all', program = 'all', level = 'all', academicYear = 'all', limit = 10, offset = 0 } = {}) => {
    const { where, params } = buildBatchQuery(tenantId, { search, branch, status, course, program, level, academicYear });

    const [rows] = await pool.query(
        `${BATCH_SELECT}
         WHERE ${where}
         ORDER BY ay.start_date DESC, b.name ASC, bt.name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );

    const BATCH_COUNT_JOIN = `
        FROM batches bt
        JOIN levels lv ON bt.level_id = lv.id
        LEFT JOIN courses c ON lv.course_id = c.id
        LEFT JOIN programs p ON lv.program_id = p.id
    `;

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total ${BATCH_COUNT_JOIN} WHERE ${where}`,
        params
    );

    return { data: rows.map(rowToBatch), total: countRows[0].total };
};

const getBatch = async (tenantId, id) => {
    const [rows] = await pool.query(
        `${BATCH_SELECT}
         WHERE bt.tenant_id = ? AND bt.deleted_at IS NULL AND bt.id = ?`,
        [tenantId, Number(id)]
    );
    return rows[0] ? rowToBatch(rows[0]) : null;
};

const generateCode = async (conn, tenantId, branchId, academicYearName) => {
    const [countRows] = await conn.query(
        `SELECT COUNT(*) AS total FROM batches
         WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(branchId)]
    );
    const fiscalYear = (academicYearName || '').replace(/\s+|[^0-9-]/g, '') || 'YYYY';
    return `BAT-${fiscalYear}-${String(countRows[0].total + 1).padStart(3, '0')}`;
};

const createBatch = async (tenantId, data, userId) => {
    const payload = normalizeCreatePayload(data);

    if (!payload.name || !payload.branchId || !payload.academicYearId || !payload.levelId) {
        const error = new Error('Missing required fields (name, branchId, academicYearId, levelId)');
        error.code = 'ER_BATCH_REQUIRED';
        throw error;
    }

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

        const academicYear = await getAcademicYearInBranch(conn, tenantId, branchId, payload.academicYearId);
        if (!academicYear) {
            await conn.rollback();
            const error = new Error('Academic year not found for this branch');
            error.code = 'ER_AY_NOT_FOUND';
            throw error;
        }

        const levelId = await getLevelInTenant(conn, tenantId, payload.levelId);
        if (!levelId) {
            await conn.rollback();
            const error = new Error('Level not found for this institute');
            error.code = 'ER_LEVEL_NOT_FOUND';
            throw error;
        }

        let classroomId = null;
        if (payload.classroomId) {
            classroomId = await getClassroomInBranch(conn, tenantId, branchId, payload.classroomId);
            if (!classroomId) {
                await conn.rollback();
                const error = new Error('Classroom not found for this branch');
                error.code = 'ER_CLASSROOM_NOT_FOUND';
                throw error;
            }
        }

        const code = payload.code || await generateCode(conn, tenantId, branchId, academicYear.name);

        const [insert] = await conn.query(
            `INSERT INTO batches
                (tenant_id, branch_id, academic_year_id, level_id, name, code, capacity,
                 start_time, end_time, classroom_id, status, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, branchId, academicYear.id, levelId, payload.name, code, payload.capacity,
             payload.startTime || null, payload.endTime || null, classroomId,
             payload.status, userId, userId]
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

const updateBatch = async (tenantId, id, data, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existingRows] = await conn.query(
            `SELECT * FROM batches
             WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
            [tenantId, Number(id)]
        );
        if (!existingRows.length) {
            await conn.rollback();
            return null;
        }
        const current = existingRows[0];

        const payload = normalizeCreatePayload({ ...rowToEditPayload(current), ...data });

        if (!payload.name) {
            await conn.rollback();
            const error = new Error('Missing required fields (name)');
            error.code = 'ER_BATCH_REQUIRED';
            throw error;
        }

        const branchId = await getBranchIdInTenant(conn, tenantId, payload.branchId);
        if (!branchId) {
            await conn.rollback();
            const error = new Error('Branch not found for this institute');
            error.code = 'ER_BRANCH_NOT_FOUND';
            throw error;
        }

        const academicYear = await getAcademicYearInBranch(conn, tenantId, branchId, payload.academicYearId);
        if (!academicYear) {
            await conn.rollback();
            const error = new Error('Academic year not found for this branch');
            error.code = 'ER_AY_NOT_FOUND';
            throw error;
        }

        const levelId = await getLevelInTenant(conn, tenantId, payload.levelId);
        if (!levelId) {
            await conn.rollback();
            const error = new Error('Level not found for this institute');
            error.code = 'ER_LEVEL_NOT_FOUND';
            throw error;
        }

        let classroomId = null;
        if (payload.classroomId) {
            classroomId = await getClassroomInBranch(conn, tenantId, branchId, payload.classroomId);
            if (!classroomId) {
                await conn.rollback();
                const error = new Error('Classroom not found for this branch');
                error.code = 'ER_CLASSROOM_NOT_FOUND';
                throw error;
            }
        }

        const code = payload.code || current.code || await generateCode(conn, tenantId, branchId, academicYear.name);

        await conn.query(
            `UPDATE batches
             SET branch_id = ?, academic_year_id = ?, level_id = ?, name = ?, code = ?,
                 capacity = ?, start_time = ?, end_time = ?, classroom_id = ?, status = ?,
                 updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [branchId, academicYear.id, levelId, payload.name, code, payload.capacity,
             payload.startTime || null, payload.endTime || null, classroomId,
             payload.status, userId, current.id]
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

const deleteBatch = async (tenantId, id, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `UPDATE batches
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

const getAcademicYears = async (tenantId, branch = 'all') => {
    let where = 'ay.tenant_id = ? AND ay.deleted_at IS NULL';
    const params = [tenantId];

    if (branch && String(branch).toLowerCase() !== 'all') {
        where += ' AND ay.branch_id = ?';
        params.push(Number(branch));
    }

    const [rows] = await pool.query(
        `SELECT ay.*, b.name AS branch_name
         FROM academic_years ay
         JOIN branches b ON ay.branch_id = b.id
         WHERE ${where}
         ORDER BY ay.start_date DESC`,
        params
    );

    return rows.map(row => ({
        id: String(row.id),
        branchId: String(row.branch_id),
        branchName: row.branch_name || '',
        name: row.name,
        startDate: row.start_date ? String(row.start_date).substring(0, 10) : '',
        endDate: row.end_date ? String(row.end_date).substring(0, 10) : '',
        status: titleize(row.status)
    }));
};

module.exports = {
    getBatches,
    getBatch,
    createBatch,
    updateBatch,
    deleteBatch,
    getAcademicYears
};