const pool = require('../config/db');

const STATUS_MAP = {
    0: 'Draft',
    1: 'Published',
    2: 'Closed'
};

const formatStatus = (status) => {
    const num = Number(status);
    if (num in STATUS_MAP) return STATUS_MAP[num];
    const s = String(status || '').toLowerCase().trim();
    if (s === 'published' || s === '1') return 'Published';
    if (s === 'closed' || s === '2') return 'Closed';
    return 'Draft';
};

const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

const safeNumber = (value) =>
    (value === undefined || value === null || value === '') ? null : Number(value);

const toDbDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ` +
            `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    }
    const str = String(value);
    const dateOnly = str.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnly) return `${dateOnly[1]} 23:59:59`;
    return str.replace('T', ' ').substring(0, 19);
};

const ALLOWED_TYPES = ['assignment', 'homework', 'exam'];

const normalizeCreatePayload = (data) => {
    const batchIds = parseJsonArray(data.batch_ids ?? data.batchIds).map(Number).filter(Boolean);
    const files = parseJsonArray(data.files).map(f => String(f));
    const rawType = String(data.assignment_type ?? data.assignmentType ?? 'assignment').toLowerCase().trim();
    const assignmentType = ALLOWED_TYPES.includes(rawType) ? rawType : 'assignment';
    return {
        branchId: Number(data.branch_id ?? data.branchId),
        academicYearId: Number(data.academic_year_id ?? data.academicYearId),
        subjectId: Number(data.subject_id ?? data.subjectId),
        title: String(data.title || '').trim(),
        description: data.description ? String(data.description).trim() : '',
        assignmentType,
        batchIds,
        files,
        dueDate: toDbDateTime(data.due_date ?? data.dueDate),
        maxMarks: safeNumber(data.max_marks ?? data.maxMarks)
    };
};

const rowToHomework = (row) => {
    const batchIds = parseJsonArray(row.batch_ids);
    const files = parseJsonArray(row.files);
    return {
        id: String(row.id),
        branchId: String(row.branch_id),
        branchName: row.branch_name || '',
        academicYearId: String(row.academic_year_id),
        academicYearName: row.academic_year_name || '',
        subjectId: String(row.subject_id),
        subjectName: row.subject_name || '',
        subjectCode: row.subject_code || '',
        title: row.title,
        description: row.description || '',
        assignmentType: row.assignment_type || 'assignment',
        batchIds,
        batchNames: Array.isArray(row.batch_names) ? row.batch_names : [],
        files,
        dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : '',
        dueDateTime: row.due_date ? String(row.due_date).replace(' ', 'T') : '',
        maxMarks: row.max_marks === null || row.max_marks === undefined ? null : Number(row.max_marks),
        status: formatStatus(row.status),
        statusCode: Number(row.status ?? 0),
        publishedAt: row.published_at || null,
        closedAt: row.closed_at || null,
        submittedCount: Number(row.submitted_count || 0),
        totalCount: Number(row.total_count || 0),
        createdBy: row.created_by ? String(row.created_by) : '',
        updatedAt: row.updated_at || null
    };
};

const assertHomeworkAccess = async (conn, tenantId, homeworkId, accessContext) => {
    const executor = conn || pool;
    const [rows] = await executor.query(
        `SELECT * FROM homeworks WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
        [tenantId, Number(homeworkId)]
    );
    if (!rows.length) {
        const err = new Error('Homework not found');
        err.statusCode = 404;
        err.code = 'ER_HW_NOT_FOUND';
        throw err;
    }
    const hw = rows[0];
    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        if (Number(hw.branch_id) !== Number(accessContext.authorizedBranchId)) {
            const err = new Error('Forbidden: You do not have access to homework belonging to another branch');
            err.statusCode = 403;
            err.code = 'ER_FORBIDDEN_BRANCH';
            throw err;
        }
    }
    return hw;
};

const getBranchInTenant = async (conn, tenantId, branchId) => {
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

const getSubjectInTenant = async (conn, tenantId, subjectId) => {
    const [rows] = await conn.query(
        `SELECT id, name, code FROM subjects
         WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' AND id = ?`,
        [tenantId, Number(subjectId)]
    );
    return rows.length ? rows[0] : null;
};

const getBatchesInBranchYear = async (conn, tenantId, branchId, academicYearId, batchIds) => {
    if (!batchIds || !batchIds.length) return [];
    const [rows] = await conn.query(
        `SELECT id, name FROM batches
         WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1 OR status = '1')
           AND branch_id = ? AND academic_year_id = ? AND id IN (?)`,
        [tenantId, Number(branchId), Number(academicYearId), batchIds]
    );
    return rows;
};

const getTeacherAssignedBatchIds = async (tenantId, teacherUserId) => {
    const [rows] = await pool.query(
        `SELECT batch_id FROM teacher_allocations
         WHERE tenant_id = ? AND teacher_user_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(teacherUserId)]
    );
    return rows.map(r => Number(r.batch_id));
};

const enrichCounts = async (tenantId, homeworkRows, batchIdsById) => {
    const homeworkIds = homeworkRows.map(h => Number(h.id));
    if (!homeworkIds.length) return homeworkRows;

    const idList = [...new Set(homeworkIds)];

    // Total enrolled students across each homework's targeted batches
    const pairs = [];
    idList.forEach(id => {
        (batchIdsById.get(id) || []).forEach(b => pairs.push([id, b]));
    });
    if (pairs.length) {
        const derived = pairs.map(() => 'SELECT ? AS homework_id, ? AS batch_id').join(' UNION ALL ');
        const [totalRows] = await pool.query(
            `SELECT hb.homework_id, COUNT(DISTINCT se.student_id) AS total
               FROM (${derived}) hb
               JOIN student_enrollments se
                 ON se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
                AND se.batch_id = hb.batch_id
              GROUP BY hb.homework_id`,
            [...pairs.flat(), tenantId]
        );
        totalRows.forEach(r => {
            const hw = homeworkRows.find(h => Number(h.id) === Number(r.homework_id));
            if (hw) hw.total_count = Number(r.total);
        });
    }

    const [submittedRows] = await pool.query(
        `SELECT homework_id, COUNT(*) AS cnt
           FROM homework_submissions
          WHERE tenant_id = ? AND deleted_at IS NULL AND homework_id IN (?)
          GROUP BY homework_id`,
        [tenantId, idList]
    );
    submittedRows.forEach(r => {
        const hw = homeworkRows.find(h => Number(h.id) === Number(r.homework_id));
        if (hw) hw.submitted_count = Number(r.cnt);
    });

    return homeworkRows;
};

const HOMEWORK_SELECT = `
    SELECT hw.*,
           s.name AS subject_name, s.code AS subject_code,
           b.name AS branch_name,
           ay.name AS academic_year_name
    FROM homeworks hw
    LEFT JOIN subjects s ON s.id = hw.subject_id
    LEFT JOIN branches b ON b.id = hw.branch_id
    LEFT JOIN academic_years ay ON ay.id = hw.academic_year_id
`;

const fetchHomeworkRows = async (tenantId, teacherUserId, accessContext) => {
    let whereClause = `WHERE hw.tenant_id = ? AND hw.deleted_at IS NULL`;
    const params = [tenantId];

    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        whereClause += ` AND hw.branch_id = ?`;
        params.push(Number(accessContext.authorizedBranchId));
    }

    const [rows] = await pool.query(
        `${HOMEWORK_SELECT}
         ${whereClause}
         ORDER BY hw.updated_at DESC`,
        params
    );

    let assignedBatchIds = [];
    if (teacherUserId && (!accessContext || accessContext.scope !== 'BRANCH')) {
        assignedBatchIds = await getTeacherAssignedBatchIds(tenantId, teacherUserId);
    }

    // Batch id -> names lookup for output
    const allBatchIds = [...new Set(rows.flatMap(r => parseJsonArray(r.batch_ids).map(Number)))];
    const batchNamesById = new Map();
    if (allBatchIds.length) {
        const [batchRows] = await pool.query(
            `SELECT id, name FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (?)`,
            [tenantId, allBatchIds]
        );
        batchRows.forEach(br => batchNamesById.set(Number(br.id), br.name));
    }

    const batchIdsById = new Map();
    const filtered = rows.filter(r => {
        const batchIds = parseJsonArray(r.batch_ids).map(Number);
        batchIdsById.set(Number(r.id), batchIds);
        if (assignedBatchIds.length && !batchIds.some(id => assignedBatchIds.includes(id))) return false;
        return true;
    });

    const enriched = await enrichCounts(tenantId, filtered, batchIdsById);
    return enriched
        .map(r => rowToHomework({
            ...r,
            batch_names: parseJsonArray(r.batch_ids).map(id => batchNamesById.get(Number(id)) || '')
        }));
};

// Teacher/Admin/Branch: fetch homeworks scoped to allocations or branch.
const getHomeworks = async (tenantId, teacherUserId, filters = {}, accessContext = null) => {
    const { status = 'all', subject = 'all', batch = 'all', branch = 'all', search = '', assignmentType = 'all' } = filters;
    const rows = await fetchHomeworkRows(tenantId, teacherUserId, accessContext);

    return rows.filter(hw => {
        if (status && String(status).toLowerCase() !== 'all') {
            const filterNorm = formatStatus(status).toLowerCase();
            if (hw.status.toLowerCase() !== filterNorm) return false;
        }
        if (assignmentType && String(assignmentType).toLowerCase() !== 'all' && hw.assignmentType.toLowerCase() !== String(assignmentType).toLowerCase()) return false;
        if (subject && String(subject).toLowerCase() !== 'all' && Number(hw.subjectId) !== Number(subject)) return false;
        if (batch && String(batch).toLowerCase() !== 'all' && !hw.batchIds.includes(Number(batch))) return false;
        if (branch && String(branch).toLowerCase() !== 'all' && Number(hw.branchId) !== Number(branch)) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (!hw.title.toLowerCase().includes(q) && !hw.subjectName.toLowerCase().includes(q) && !hw.batchNames.some(n => n.toLowerCase().includes(q))) return false;
        }
        return true;
    });
};

const getHomework = async (tenantId, id, teacherUserId, accessContext = null) => {
    const rows = await fetchHomeworkRows(tenantId, teacherUserId, accessContext);
    return rows.find(h => h.id === String(id)) || null;
};

// Branch Admin Scoping (Branch specific)
const getBranchScoping = async (tenantId, branchId) => {
    const bId = Number(branchId);
    const [branches] = await pool.query(
        `SELECT id, name FROM branches WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
        [tenantId, bId]
    );
    if (!branches.length) {
        const error = new Error('Branch not found or inaccessible');
        error.statusCode = 404;
        throw error;
    }

    const [batches] = await pool.query(
        `SELECT bt.id, bt.name, bt.academic_year_id 
           FROM batches bt
          WHERE bt.tenant_id = ? AND bt.branch_id = ? AND bt.deleted_at IS NULL AND (bt.status = 'active' OR bt.status = 1 OR bt.status = '1')
          ORDER BY bt.name ASC`,
        [tenantId, bId]
    );

    const [subjects] = await pool.query(
        `SELECT DISTINCT s.id, s.name, s.code
           FROM subjects s
          WHERE s.tenant_id = ? AND s.deleted_at IS NULL AND (s.status = 'active' OR s.status = 1 OR s.status = '1' OR s.status IS NULL)
          ORDER BY s.name ASC`,
        [tenantId]
    );

    const [academicYears] = await pool.query(
        `SELECT DISTINCT ay.id, ay.name, ay.start_date
           FROM academic_years ay
          WHERE ay.tenant_id = ? AND ay.branch_id = ? AND ay.deleted_at IS NULL
          ORDER BY ay.start_date DESC`,
        [tenantId, bId]
    );

    return {
        scoped: true,
        branch: { id: String(branches[0].id), name: branches[0].name },
        branches: [{ id: String(branches[0].id), name: branches[0].name }],
        batches: batches.map(b => ({ id: String(b.id), name: b.name, academicYearId: b.academic_year_id ? String(b.academic_year_id) : null })),
        subjects: subjects.map(s => ({ id: String(s.id), name: s.name, code: s.code || '' })),
        academicYears: academicYears.map(ay => ({ id: String(ay.id), name: ay.name }))
    };
};

const getTeacherScoping = async (tenantId, teacherUserId) => {
    const params = [tenantId, Number(teacherUserId)];

    const [branches] = await pool.query(
        `SELECT DISTINCT b.id, b.name
           FROM teacher_allocations ta
           JOIN branches b ON b.id = ta.branch_id
          WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL
            AND b.deleted_at IS NULL
          ORDER BY b.name ASC`,
        params
    );

    const [batches] = await pool.query(
        `SELECT DISTINCT ta.batch_id AS id, bt.name
           FROM teacher_allocations ta
           JOIN batches bt ON bt.id = ta.batch_id
          WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL
            AND bt.deleted_at IS NULL AND (bt.status = 'active' OR bt.status = 1 OR bt.status = '1')
          ORDER BY bt.name ASC`,
        params
    );

    const [subjects] = await pool.query(
        `SELECT DISTINCT ts.subject_id AS id, s.name, s.code
           FROM teacher_subjects ts
           JOIN subjects s ON s.id = ts.subject_id
          WHERE ts.tenant_id = ? AND ts.teacher_user_id = ?
            AND s.deleted_at IS NULL AND (s.status = 'active' OR s.status = 1 OR s.status = '1' OR s.status IS NULL)
          ORDER BY s.name ASC`,
        params
    );

    const [academicYears] = await pool.query(
        `SELECT DISTINCT ay.id, ay.name, ay.start_date
           FROM teacher_allocations ta
           JOIN academic_years ay ON ay.id = ta.academic_year_id
          WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL
            AND ay.deleted_at IS NULL
          ORDER BY ay.start_date DESC`,
        params
    );

    if (!branches.length && !batches.length && !subjects.length) {
        const [allBranches] = await pool.query(
            `SELECT id, name FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`, [tenantId]);
        const [allBatches] = await pool.query(
            `SELECT bt.id, bt.name FROM batches bt
              JOIN academic_years ay ON ay.id = bt.academic_year_id
             WHERE bt.tenant_id = ? AND bt.deleted_at IS NULL AND (bt.status = 'active' OR bt.status = 1 OR bt.status = '1')
             ORDER BY bt.name ASC`, [tenantId]);
        const [allSubjects] = await pool.query(
            `SELECT id, name, code FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1 OR status = '1' OR status IS NULL) ORDER BY name ASC`, [tenantId]);
        const [allYears] = await pool.query(
            `SELECT id, name FROM academic_years WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY start_date DESC`, [tenantId]);

        return {
            scoped: false,
            branches: allBranches.map(b => ({ id: String(b.id), name: b.name })),
            batches: allBatches.map(b => ({ id: String(b.id), name: b.name })),
            subjects: allSubjects.map(s => ({ id: String(s.id), name: s.name, code: s.code || '' })),
            academicYears: allYears.map(ay => ({ id: String(ay.id), name: ay.name }))
        };
    }

    return {
        scoped: true,
        branches: branches.map(b => ({ id: String(b.id), name: b.name })),
        batches: batches.map(b => ({ id: String(b.id), name: b.name })),
        subjects: subjects.map(s => ({ id: String(s.id), name: s.name, code: s.code || '' })),
        academicYears: academicYears.map(ay => ({ id: String(ay.id), name: ay.name }))
    };
};

const createHomework = async (tenantId, data, userId, accessContext = null) => {
    const payload = normalizeCreatePayload(data);

    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        payload.branchId = Number(accessContext.authorizedBranchId);
    }

    if (!payload.title || !payload.subjectId || !payload.branchId || !payload.academicYearId || !payload.dueDate) {
        const error = new Error('Missing required fields (title, subjectId, branchId, academicYearId, dueDate)');
        error.code = 'ER_HW_REQUIRED';
        throw error;
    }
    if (!payload.batchIds || !payload.batchIds.length) {
        const error = new Error('At least one target batch is required');
        error.code = 'ER_HW_BATCH_REQUIRED';
        throw error;
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const branchId = await getBranchInTenant(conn, tenantId, payload.branchId);
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

        const subject = await getSubjectInTenant(conn, tenantId, payload.subjectId);
        if (!subject) {
            await conn.rollback();
            const error = new Error('Subject not found for this institute');
            error.code = 'ER_SUBJECT_NOT_FOUND';
            throw error;
        }

        const batches = await getBatchesInBranchYear(conn, tenantId, branchId, academicYear.id, payload.batchIds);
        if (batches.length !== payload.batchIds.length) {
            await conn.rollback();
            const error = new Error('One or more target batches are invalid for this branch/academic year');
            error.code = 'ER_HW_BATCH_INVALID';
            throw error;
        }

        const [insert] = await conn.query(
            `INSERT INTO homeworks
                (tenant_id, branch_id, academic_year_id, subject_id, title, description,
                 assignment_type, batch_ids, files, due_date, max_marks, status, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [tenantId, branchId, academicYear.id, subject.id, payload.title, payload.description,
             payload.assignmentType, JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
             payload.dueDate, payload.maxMarks, userId, userId]
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

const updateHomework = async (tenantId, id, data, userId, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const current = await assertHomeworkAccess(conn, tenantId, id, accessContext);

        const payload = normalizeCreatePayload({
            branchId: current.branch_id,
            academicYearId: current.academic_year_id,
            subjectId: current.subject_id,
            title: current.title,
            description: current.description,
            assignmentType: current.assignment_type,
            batchIds: parseJsonArray(current.batch_ids),
            files: parseJsonArray(current.files),
            dueDate: current.due_date ? toDbDateTime(current.due_date) : current.due_date,
            maxMarks: current.max_marks,
            ...data
        });

        if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
            payload.branchId = Number(accessContext.authorizedBranchId);
        }

        if (!payload.title || !payload.dueDate) {
            await conn.rollback();
            const error = new Error('Missing required fields (title, dueDate)');
            error.code = 'ER_HW_REQUIRED';
            throw error;
        }
        if (!payload.batchIds.length) {
            await conn.rollback();
            const error = new Error('At least one target batch is required');
            error.code = 'ER_HW_BATCH_REQUIRED';
            throw error;
        }

        // Batches cannot be changed once the homework is published (status = 1).
        const currentStatusCode = Number(current.status);
        if (currentStatusCode === 1 && JSON.stringify(payload.batchIds) !== JSON.stringify(parseJsonArray(current.batch_ids))) {
            await conn.rollback();
            const error = new Error('Target batches cannot be changed once the homework is published');
            error.code = 'ER_HW_LOCKED';
            throw error;
        }

        const branchId = await getBranchInTenant(conn, tenantId, payload.branchId);
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

        const subject = await getSubjectInTenant(conn, tenantId, payload.subjectId);
        if (!subject) {
            await conn.rollback();
            const error = new Error('Subject not found for this institute');
            error.code = 'ER_SUBJECT_NOT_FOUND';
            throw error;
        }

        const batches = await getBatchesInBranchYear(conn, tenantId, branchId, academicYear.id, payload.batchIds);
        if (batches.length !== payload.batchIds.length) {
            await conn.rollback();
            const error = new Error('One or more target batches are invalid for this branch/academic year');
            error.code = 'ER_HW_BATCH_INVALID';
            throw error;
        }

        await conn.query(
            `UPDATE homeworks
                SET branch_id = ?, academic_year_id = ?, subject_id = ?, title = ?, description = ?,
                    assignment_type = ?, batch_ids = ?, files = ?, due_date = ?, max_marks = ?,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND deleted_at IS NULL`,
            [branchId, academicYear.id, subject.id, payload.title, payload.description,
             payload.assignmentType, JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
             payload.dueDate, payload.maxMarks, userId, current.id]
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

const deleteHomework = async (tenantId, id, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const current = await assertHomeworkAccess(conn, tenantId, id, accessContext);

        if (Number(current.status) === 1) {
            await conn.rollback();
            return 'active';
        }

        await conn.query(
            `UPDATE homeworks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND deleted_at IS NULL`,
            [Number(id)]
        );

        await conn.commit();
        return 'deleted';
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const publishHomework = async (tenantId, id, userId, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const current = await assertHomeworkAccess(conn, tenantId, id, accessContext);

        const currentStatus = Number(current.status);
        if (currentStatus === 2) {
            await conn.rollback();
            return 'closed';
        }
        if (currentStatus === 1) {
            await conn.commit();
            return 'published';
        }

        await conn.query(
            `UPDATE homeworks
                SET status = 1, published_at = CURRENT_TIMESTAMP,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND deleted_at IS NULL`,
            [userId, Number(id)]
        );

        await conn.commit();
        return 'published';
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const closeHomework = async (tenantId, id, userId, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const current = await assertHomeworkAccess(conn, tenantId, id, accessContext);

        if (Number(current.status) !== 1) {
            await conn.rollback();
            return 'not_published';
        }

        await conn.query(
            `UPDATE homeworks
                SET status = 2, closed_at = CURRENT_TIMESTAMP,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND deleted_at IS NULL`,
            [userId, Number(id)]
        );

        await conn.commit();
        return 'closed';
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const getSubmissions = async (tenantId, homeworkId, accessContext = null) => {
    const hw = await assertHomeworkAccess(null, tenantId, homeworkId, accessContext);

    const [rows] = await pool.query(
        `SELECT hs.id, hs.homework_id, hs.student_id, hs.response_text, hs.files, hs.status,
                hs.marks_obtained, hs.teacher_feedback, hs.submitted_at, hs.graded_at,
                st.full_name AS student_name, st.student_code
           FROM homework_submissions hs
           JOIN students st ON st.id = hs.student_id
          WHERE hs.tenant_id = ? AND hs.homework_id = ? AND hs.deleted_at IS NULL
          ORDER BY hs.submitted_at ASC`,
        [tenantId, Number(homeworkId)]
    );

    return {
        homework: { id: String(hw.id), status: hw.status },
        submissions: rows.map(r => ({
            id: String(r.id),
            homeworkId: String(r.homework_id),
            studentId: String(r.student_id),
            studentName: r.student_name,
            studentCode: r.student_code || '',
            responseText: r.response_text || '',
            files: parseJsonArray(r.files),
            status: titleize(r.status),
            marksObtained: r.marks_obtained === null || r.marks_obtained === undefined ? null : Number(r.marks_obtained),
            feedback: r.teacher_feedback || '',
            submittedAt: r.submitted_at || null,
            gradedAt: r.graded_at || null
        }))
    };
};

const gradeSubmission = async (tenantId, homeworkId, submissionId, data, userId, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const hw = await assertHomeworkAccess(conn, tenantId, homeworkId, accessContext);

        let subId = Number(submissionId);
        const studentId = safeNumber(data.studentId ?? data.student_id);

        let existingSub = null;
        if (subId && !isNaN(subId)) {
            const [rows] = await conn.query(
                `SELECT id, student_id FROM homework_submissions
                  WHERE tenant_id = ? AND homework_id = ? AND id = ? AND deleted_at IS NULL`,
                [tenantId, Number(homeworkId), subId]
            );
            if (rows.length) {
                existingSub = rows[0];
            }
        }

        if (!existingSub && studentId) {
            const [rows] = await conn.query(
                `SELECT id, student_id FROM homework_submissions
                  WHERE tenant_id = ? AND homework_id = ? AND student_id = ? AND deleted_at IS NULL`,
                [tenantId, Number(homeworkId), studentId]
            );
            if (rows.length) {
                existingSub = rows[0];
            }
        }

        const marks = safeNumber(data.marks_obtained ?? data.marksObtained);
        const feedback = data.teacher_feedback ?? data.feedback ?? '';
        if (marks === null) {
            await conn.rollback();
            const error = new Error('Marks are required for grading');
            error.code = 'ER_HW_MARKS_REQUIRED';
            throw error;
        }

        if (existingSub) {
            await conn.query(
                `UPDATE homework_submissions
                    SET marks_obtained = ?, teacher_feedback = ?, status = 'graded',
                        graded_by = ?, graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
                [marks, String(feedback), userId, existingSub.id]
            );
            await conn.commit();
            return { id: String(existingSub.id) };
        } else if (studentId) {
            const [ins] = await conn.query(
                `INSERT INTO homework_submissions
                    (tenant_id, homework_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at)
                 VALUES (?, ?, ?, 'graded', ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
                [tenantId, Number(homeworkId), studentId, marks, String(feedback), userId]
            );
            await conn.commit();
            return { id: String(ins.insertId) };
        } else {
            await conn.rollback();
            return null;
        }
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const bulkGradeSubmissions = async (tenantId, homeworkId, rows, userId, accessContext = null) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const hw = await assertHomeworkAccess(conn, tenantId, homeworkId, accessContext);

        const maxMarks = hw.max_marks !== null && hw.max_marks !== undefined ? Number(hw.max_marks) : null;
        const batchIds = parseJsonArray(hw.batch_ids).map(Number).filter(Boolean);

        // Fetch all valid enrolled students in these batches
        const [studentRows] = await conn.query(
            `SELECT DISTINCT st.id, st.student_code
               FROM student_enrollments se
               JOIN students st ON st.id = se.student_id AND st.tenant_id = ? AND st.deleted_at IS NULL
              WHERE se.tenant_id = ? AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL`,
            [tenantId, tenantId, batchIds.length ? batchIds : [0]]
        );

        const studentCodeMap = new Map();
        const studentIdMap = new Map();

        studentRows.forEach(st => {
            if (st.student_code) {
                studentCodeMap.set(String(st.student_code).trim().toLowerCase(), Number(st.id));
            }
            studentIdMap.set(String(st.id), Number(st.id));
        });

        const [existingSubRows] = await conn.query(
            `SELECT id, student_id FROM homework_submissions 
              WHERE tenant_id = ? AND homework_id = ? AND deleted_at IS NULL`,
            [tenantId, Number(homeworkId)]
        );
        const existingSubMap = new Map(existingSubRows.map(s => [Number(s.student_id), Number(s.id)]));

        let successCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rawId = String(
                row['Roll No / ID'] ??
                row['Student ID / Roll No'] ??
                row['Roll No'] ??
                row['Student ID'] ??
                row['student_code'] ??
                row['student_id'] ??
                row['StudentID'] ??
                row['Student Code'] ??
                row['RollNo'] ??
                row['ID'] ??
                ''
            ).trim();

            if (!rawId) {
                errors.push(`Row ${i + 1}: Missing Student ID / Roll No`);
                continue;
            }

            const studentId = studentCodeMap.get(rawId.toLowerCase()) ?? studentIdMap.get(rawId) ?? null;

            if (!studentId) {
                errors.push(`Row ${i + 1}: Student ID / Roll No "${rawId}" not found in enrolled batches`);
                continue;
            }

            const rawMarks = row['Marks Obtained'] ?? row['Marks'] ?? row['marks_obtained'] ?? row['marks'];
            const marks = safeNumber(rawMarks);

            if (marks === null || isNaN(marks) || marks < 0) {
                errors.push(`Row ${i + 1} (${rawId}): Invalid marks "${rawMarks ?? ''}"`);
                continue;
            }

            if (maxMarks !== null && marks > maxMarks) {
                errors.push(`Row ${i + 1} (${rawId}): Marks ${marks} exceeds maximum allowed marks (${maxMarks})`);
                continue;
            }

            const feedback = String(row['Remarks'] ?? row['Teacher Feedback'] ?? row['Feedback'] ?? row['remarks'] ?? '').trim();

            const existingSubId = existingSubMap.get(studentId);
            if (existingSubId) {
                await conn.query(
                    `UPDATE homework_submissions
                        SET marks_obtained = ?, teacher_feedback = ?, status = 'graded',
                            graded_by = ?, graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?`,
                    [marks, feedback, userId, existingSubId]
                );
            } else {
                const [ins] = await conn.query(
                    `INSERT INTO homework_submissions
                        (tenant_id, homework_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at)
                     VALUES (?, ?, ?, 'graded', ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
                    [tenantId, Number(homeworkId), studentId, marks, feedback, userId]
                );
                existingSubMap.set(studentId, ins.insertId);
            }
            successCount++;
        }

        await conn.commit();
        return {
            successCount,
            errorCount: errors.length,
            errors
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ─── Student-facing ─────────────────────────────────────────────────────────

const resolveStudentByUserId = async (tenantId, userId) => {
    const [rows] = await pool.query(
        `SELECT id FROM students WHERE tenant_id = ? AND user_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(userId)]
    );
    return rows.length ? rows[0].id : null;
};

const getStudentEnrolledBatchIds = async (tenantId, studentId) => {
    const [rows] = await pool.query(
        `SELECT batch_id FROM student_enrollments
          WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL`,
        [tenantId, Number(studentId)]
    );
    return rows.map(r => Number(r.batch_id));
};

const getStudentHomeworks = async (tenantId, studentId) => {
    const enrolledBatchIds = await getStudentEnrolledBatchIds(tenantId, studentId);

    const [rows] = await pool.query(
        `${HOMEWORK_SELECT}
         WHERE hw.tenant_id = ? AND hw.deleted_at IS NULL AND hw.status IN ('published', 'closed')
         ORDER BY hw.due_date ASC`,
        [tenantId]
    );

    const [submissionRows] = await pool.query(
        `SELECT homework_id, status, marks_obtained, teacher_feedback, submitted_at
           FROM homework_submissions
          WHERE tenant_id = ? AND student_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(studentId)]
    );
    const submissionByHomework = new Map(submissionRows.map(s => [Number(s.homework_id), s]));

    const batchNamesById = new Map();
    const allBatchIds = [...new Set(rows.flatMap(r => parseJsonArray(r.batch_ids).map(Number)))];
    if (allBatchIds.length) {
        const [batchRows] = await pool.query(
            `SELECT id, name FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (?)`,
            [tenantId, allBatchIds]
        );
        batchRows.forEach(br => batchNamesById.set(Number(br.id), br.name));
    }

    return rows
        .filter(r => {
            const batchIds = parseJsonArray(r.batch_ids).map(Number);
            return enrolledBatchIds.length && batchIds.some(id => enrolledBatchIds.includes(id));
        })
        .map(r => {
            const sub = submissionByHomework.get(Number(r.id));
            return {
                ...rowToHomework({
                    ...r,
                    batch_names: parseJsonArray(r.batch_ids).map(id => batchNamesById.get(Number(id)) || ''),
                    submitted_count: sub ? 1 : 0,
                    total_count: 0
                }),
                mySubmission: sub ? {
                    status: titleize(sub.status),
                    marksObtained: sub.marks_obtained === null || sub.marks_obtained === undefined ? null : Number(sub.marks_obtained),
                    feedback: sub.teacher_feedback || '',
                    submittedAt: sub.submitted_at || null,
                    isLate: Boolean(r.due_date && sub.submitted_at && new Date(sub.submitted_at) > new Date(r.due_date))
                } : null
            };
        });
};

const getStudentHomework = async (tenantId, studentId, id) => {
    const list = await getStudentHomeworks(tenantId, studentId);
    return list.find(h => h.id === String(id)) || null;
};

const submitHomework = async (tenantId, studentId, homeworkId, data) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const enrolledBatchIds = await getStudentEnrolledBatchIds(tenantId, studentId);

        const [hwRows] = await conn.query(
            `SELECT batch_ids, status, due_date FROM homeworks
              WHERE tenant_id = ? AND deleted_at IS NULL AND id = ?`,
            [tenantId, Number(homeworkId)]
        );
        if (!hwRows.length) {
            await conn.rollback();
            return 'not_found';
        }
        const hw = hwRows[0];
        if (hw.status !== 'published') {
            await conn.rollback();
            return 'not_open';
        }
        const batchIds = parseJsonArray(hw.batch_ids).map(Number);
        if (!enrolledBatchIds.some(id => batchIds.includes(id))) {
            await conn.rollback();
            return 'not_assigned';
        }

        const responseText = String(data.response_text ?? data.responseText ?? '').trim();
        const fileUrls = parseJsonArray(data.files);

        await conn.query(
            `INSERT INTO homework_submissions
                (tenant_id, homework_id, student_id, response_text, files, status, submitted_at)
             VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                response_text = VALUES(response_text),
                files = VALUES(files),
                status = 'submitted',
                submitted_at = CURRENT_TIMESTAMP,
                marks_obtained = NULL,
                teacher_feedback = NULL,
                graded_by = NULL,
                graded_at = NULL,
                updated_at = CURRENT_TIMESTAMP`,
            [tenantId, Number(homeworkId), Number(studentId), responseText, JSON.stringify(fileUrls)]
        );

        await conn.commit();
        return 'submitted';
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ─── Evaluation roster: all enrolled students + their submission (if any) ─────
const getEvaluationRoster = async (tenantId, homeworkId, accessContext = null) => {
    const hw = await assertHomeworkAccess(null, tenantId, homeworkId, accessContext);

    const batchIds = parseJsonArray(hw.batch_ids).map(Number).filter(Boolean);

    if (!batchIds.length) {
        return { homework: { id: String(hw.id), status: hw.status, maxMarks: hw.max_marks }, students: [] };
    }

    const [batchRows] = await pool.query(
        `SELECT id, name FROM batches WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL`,
        [tenantId, batchIds]
    );
    const batchNameMap = Object.fromEntries(batchRows.map(b => [b.id, b.name]));

    // All active enrolled students across those batches + their submission (if any)
    const [rows] = await pool.query(
        `SELECT
            se.student_id,
            se.batch_id,
            st.full_name     AS student_name,
            st.student_code,
            hs.id            AS submission_id,
            hs.status        AS submission_status,
            hs.response_text,
            hs.files         AS submission_files,
            hs.marks_obtained,
            hs.teacher_feedback,
            hs.submitted_at,
            hs.graded_at
         FROM student_enrollments se
         JOIN students st ON st.id = se.student_id AND st.tenant_id = ? AND st.deleted_at IS NULL
         LEFT JOIN homework_submissions hs
           ON hs.homework_id = ? AND hs.student_id = se.student_id AND hs.deleted_at IS NULL
        WHERE se.tenant_id = ? AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL
        ORDER BY se.batch_id, st.full_name`,
        [tenantId, Number(homeworkId), tenantId, batchIds]
    );

    return {
        homework: { id: String(hw.id), status: hw.status, maxMarks: hw.max_marks },
        students: rows.map(r => ({
            studentId: String(r.student_id),
            studentName: r.student_name,
            studentCode: r.student_code || '',
            batchId: String(r.batch_id),
            batchName: batchNameMap[r.batch_id] || '',
            submissionId: r.submission_id ? String(r.submission_id) : null,
            submissionStatus: r.submission_status ? (r.submission_status.charAt(0).toUpperCase() + r.submission_status.slice(1)) : null,
            responseText: r.response_text || '',
            files: parseJsonArray(r.submission_files),
            marksObtained: r.marks_obtained === null || r.marks_obtained === undefined ? null : Number(r.marks_obtained),
            feedback: r.teacher_feedback || '',
            submittedAt: r.submitted_at || null,
            gradedAt: r.graded_at || null
        }))
    };
};

module.exports = {
    assertHomeworkAccess,
    getHomeworks,
    getHomework,
    getBranchScoping,
    getTeacherScoping,
    createHomework,
    updateHomework,
    deleteHomework,
    publishHomework,
    closeHomework,
    getSubmissions,
    gradeSubmission,
    bulkGradeSubmissions,
    getEvaluationRoster,
    getStudentHomeworks,
    getStudentHomework,
    submitHomework,
    resolveStudentByUserId
};