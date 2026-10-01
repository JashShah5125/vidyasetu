const pool = require('../config/db');

const STATUS_MAP = {
    0: 'Draft',
    1: 'Published',
    2: 'Closed'
};

const formatStatus = (status) => {
    const num = Number(status);
    if (!isNaN(num) && num in STATUS_MAP) return STATUS_MAP[num];
    const s = String(status || '').toLowerCase().trim();
    if (s === 'published' || s === 'scheduled' || s === '1') return 'Published';
    if (s === 'closed' || s === 'completed' || s === '2') return 'Closed';
    return 'Draft';
};

const getStatusCode = (status) => {
    const s = formatStatus(status);
    if (s === 'Published') return 1;
    if (s === 'Closed') return 2;
    return 0;
};

const formatDueDate = (dateVal) => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())}`;
    }
    const s = String(dateVal);
    return s.slice(0, 10);
};

const formatDueDateTime = (dateVal) => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())}T${pad(dateVal.getHours())}:${pad(dateVal.getMinutes())}:${pad(dateVal.getSeconds())}`;
    }
    return String(dateVal).replace(' ', 'T').substring(0, 19);
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
        dueDate: formatDueDate(row.due_date),
        dueDateTime: formatDueDateTime(row.due_date),
        maxMarks: row.max_marks === null || row.max_marks === undefined ? null : Number(row.max_marks),
        status: formatStatus(row.status),
        statusCode: getStatusCode(row.status),
        publishedAt: row.published_at || null,
        closedAt: row.closed_at || null,
        submittedCount: Number(row.submitted_count || 0),
        totalCount: Number(row.total_count || 0),
        createdBy: row.created_by ? String(row.created_by) : '',
        updatedAt: row.updated_at || null
    };
};

const parseEntityId = (rawId) => {
    const s = String(rawId || '').trim();
    if (s.startsWith('asg-')) {
        return { type: 'assignment', id: Number(s.replace('asg-', '')) };
    }
    if (s.startsWith('exam-')) {
        return { type: 'exam', id: Number(s.replace('exam-', '')) };
    }
    if (s.startsWith('hw-')) {
        return { type: 'homework', id: Number(s.replace('hw-', '')) };
    }
    return { type: 'unknown', id: Number(s) };
};

const assertHomeworkAccess = async (conn, tenantId, rawId, accessContext) => {
    const executor = conn || pool;
    const { type, id } = parseEntityId(rawId);
    let entity = null;
    let resolvedType = type;

    if (type === 'assignment') {
        const [rows] = await executor.query(
            `SELECT a.*, 'assignment' as assignment_type, a.title, a.due_date,
                    COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)) AS batch_ids
             FROM assignments a WHERE a.tenant_id = ? AND a.id = ? AND a.deleted_at IS NULL`,
            [tenantId, id]
        );
        if (rows.length) entity = rows[0];
    } else if (type === 'exam') {
        const [rows] = await executor.query(
            `SELECT e.*, 'exam' as assignment_type, e.name as title, e.exam_date as due_date,
                    (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) as batch_ids
             FROM exams e WHERE e.tenant_id = ? AND e.id = ? AND e.deleted_at IS NULL`,
            [tenantId, id]
        );
        if (rows.length) entity = rows[0];
    } else if (type === 'homework') {
        const [rows] = await executor.query(
            `SELECT * FROM homeworks WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
            [tenantId, id]
        );
        if (rows.length) entity = rows[0];
    } else {
        const [hRows] = await executor.query(
            `SELECT * FROM homeworks WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
            [tenantId, id]
        );
        if (hRows.length) {
            entity = hRows[0];
            resolvedType = 'homework';
        } else {
            const [aRows] = await executor.query(
                `SELECT a.*, 'assignment' as assignment_type, a.title, a.due_date,
                        COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)) AS batch_ids
                 FROM assignments a WHERE a.tenant_id = ? AND a.id = ? AND a.deleted_at IS NULL`,
                [tenantId, id]
            );
            if (aRows.length) {
                entity = aRows[0];
                resolvedType = 'assignment';
            } else {
                const [eRows] = await executor.query(
                    `SELECT e.*, 'exam' as assignment_type, e.name as title, e.exam_date as due_date,
                            (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) as batch_ids
                     FROM exams e WHERE e.tenant_id = ? AND e.id = ? AND e.deleted_at IS NULL`,
                    [tenantId, id]
                );
                if (eRows.length) {
                    entity = eRows[0];
                    resolvedType = 'exam';
                }
            }
        }
    }

    if (!entity) {
        const err = new Error('Assessment not found');
        err.statusCode = 404;
        err.code = 'ER_HW_NOT_FOUND';
        throw err;
    }

    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        if (Number(entity.branch_id) !== Number(accessContext.authorizedBranchId)) {
            const err = new Error('Forbidden: You do not have access to assessment belonging to another branch');
            err.statusCode = 403;
            err.code = 'ER_FORBIDDEN_BRANCH';
            throw err;
        }
    }

    entity._entityType = resolvedType;
    return entity;
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

const fetchHomeworkRows = async (tenantId, teacherUserId, accessContext, filterAssignmentType = 'all') => {
    const typeNorm = String(filterAssignmentType || 'all').toLowerCase().trim();
    let rows = [];

    // 1. Fetch from homeworks table
    if (typeNorm === 'all' || typeNorm === 'homework') {
        let where = `WHERE hw.tenant_id = ? AND hw.deleted_at IS NULL`;
        const params = [tenantId];
        if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
            where += ` AND hw.branch_id = ?`;
            params.push(Number(accessContext.authorizedBranchId));
        }
        const [hwRows] = await pool.query(
            `SELECT hw.*, 'homework' AS assignment_type,
                    s.name AS subject_name, s.code AS subject_code,
                    b.name AS branch_name, ay.name AS academic_year_name
             FROM homeworks hw
             LEFT JOIN subjects s ON s.id = hw.subject_id
             LEFT JOIN branches b ON b.id = hw.branch_id
             LEFT JOIN academic_years ay ON ay.id = hw.academic_year_id
             ${where}
             ORDER BY hw.updated_at DESC`,
            params
        );
        rows.push(...hwRows.map(r => ({ ...r, custom_id: `hw-${r.id}` })));
    }

    // 2. Fetch from assignments table
    if (typeNorm === 'all' || typeNorm === 'assignment') {
        let where = `WHERE a.tenant_id = ? AND a.deleted_at IS NULL`;
        const params = [tenantId];
        if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
            where += ` AND a.branch_id = ?`;
            params.push(Number(accessContext.authorizedBranchId));
        }
        const [asgRows] = await pool.query(
            `SELECT a.id, a.tenant_id, a.branch_id, a.academic_year_id, a.batch_id,
                    COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)) AS batch_ids,
                    a.files, a.subject_id, a.title, a.description, a.due_date, a.max_marks,
                    a.status, a.created_by, a.updated_by, a.created_at, a.updated_at,
                    'assignment' AS assignment_type,
                    s.name AS subject_name, s.code AS subject_code,
                    b.name AS branch_name, ay.name AS academic_year_name
             FROM assignments a
             LEFT JOIN subjects s ON s.id = a.subject_id
             LEFT JOIN branches b ON b.id = a.branch_id
             LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
             ${where}
             ORDER BY a.updated_at DESC`,
            params
        );
        rows.push(...asgRows.map(r => ({ ...r, custom_id: `asg-${r.id}` })));
    }

    // 3. Fetch from exams table
    if (typeNorm === 'all' || typeNorm === 'exam') {
        let where = `WHERE e.tenant_id = ? AND e.deleted_at IS NULL`;
        const params = [tenantId];
        if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
            where += ` AND e.branch_id = ?`;
            params.push(Number(accessContext.authorizedBranchId));
        }
        const [examRows] = await pool.query(
            `SELECT e.id, e.tenant_id, e.branch_id, e.academic_year_id, e.subject_id,
                    e.name AS title, e.description, 'exam' AS assignment_type,
                    e.exam_type, e.max_marks, e.passing_marks, e.exam_date AS due_date,
                    e.start_time, e.end_time, e.status, e.files, e.metadata,
                    e.created_by, e.updated_by, e.created_at, e.updated_at,
                    s.name AS subject_name, s.code AS subject_code,
                    b.name AS branch_name, ay.name AS academic_year_name,
                    (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) AS batch_ids
             FROM exams e
             LEFT JOIN subjects s ON s.id = e.subject_id
             LEFT JOIN branches b ON b.id = e.branch_id
             LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
             ${where}
             ORDER BY e.updated_at DESC`,
            params
        );
        rows.push(...examRows.map(r => ({ ...r, custom_id: `exam-${r.id}` })));
    }

    let assignedBatchIds = [];
    if (teacherUserId && (!accessContext || accessContext.scope !== 'BRANCH')) {
        assignedBatchIds = await getTeacherAssignedBatchIds(tenantId, teacherUserId);
    }

    const allBatchIds = [...new Set(rows.flatMap(r => parseJsonArray(r.batch_ids).map(Number)).filter(Boolean))];
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
        const batchIds = parseJsonArray(r.batch_ids).map(Number).filter(Boolean);
        batchIdsById.set(r.custom_id, batchIds);
        if (assignedBatchIds.length && !batchIds.some(id => assignedBatchIds.includes(id))) return false;
        return true;
    });

    const enriched = await enrichCounts(tenantId, filtered, batchIdsById);
    return enriched.map(r => rowToHomework({
        ...r,
        id: r.custom_id,
        batch_names: parseJsonArray(r.batch_ids).map(id => batchNamesById.get(Number(id)) || '')
    }));
};

// Teacher/Admin/Branch: fetch homeworks scoped to allocations or branch.
const getHomeworks = async (tenantId, teacherUserId, filters = {}, accessContext = null) => {
    const { status = 'all', subject = 'all', batch = 'all', branch = 'all', search = '', assignmentType = 'all' } = filters;
    const rows = await fetchHomeworkRows(tenantId, teacherUserId, accessContext, assignmentType);

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
    const current = await assertHomeworkAccess(null, tenantId, id, accessContext);
    const batchIds = parseJsonArray(current.batch_ids).map(Number).filter(Boolean);
    const [batchRows] = batchIds.length
        ? await pool.query(`SELECT id, name FROM batches WHERE tenant_id = ? AND id IN (?)`, [tenantId, batchIds])
        : [[]];
    const batchNames = batchRows.map(b => b.name);
    return rowToHomework({
        ...current,
        id: String(id),
        batch_names: batchNames
    });
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
        `SELECT DISTINCT ta.batch_id AS id, bt.name, bt.branch_id, bt.academic_year_id
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
            `SELECT bt.id, bt.name, bt.branch_id, bt.academic_year_id FROM batches bt
              LEFT JOIN academic_years ay ON ay.id = bt.academic_year_id
             WHERE bt.tenant_id = ? AND bt.deleted_at IS NULL AND (bt.status = 'active' OR bt.status = 1 OR bt.status = '1')
             ORDER BY bt.name ASC`, [tenantId]);
        const [allSubjects] = await pool.query(
            `SELECT id, name, code FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1 OR status = '1' OR status IS NULL) ORDER BY name ASC`, [tenantId]);
        const [allYears] = await pool.query(
            `SELECT id, name FROM academic_years WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY start_date DESC`, [tenantId]);

        return {
            scoped: false,
            branches: allBranches.map(b => ({ id: String(b.id), name: b.name })),
            batches: allBatches.map(b => ({
                id: String(b.id),
                name: b.name,
                branchId: b.branch_id ? String(b.branch_id) : null,
                academicYearId: b.academic_year_id ? String(b.academic_year_id) : null
            })),
            subjects: allSubjects.map(s => ({ id: String(s.id), name: s.name, code: s.code || '' })),
            academicYears: allYears.map(ay => ({ id: String(ay.id), name: ay.name }))
        };
    }

    return {
        scoped: true,
        branches: branches.map(b => ({ id: String(b.id), name: b.name })),
        batches: batches.map(b => ({
            id: String(b.id),
            name: b.name,
            branchId: b.branch_id ? String(b.branch_id) : null,
            academicYearId: b.academic_year_id ? String(b.academic_year_id) : null
        })),
        subjects: subjects.map(s => ({ id: String(s.id), name: s.name, code: s.code || '' })),
        academicYears: academicYears.map(ay => ({ id: String(ay.id), name: ay.name }))
    };
};

const createHomework = async (tenantId, data, userId, accessContext = null) => {
    const payload = normalizeCreatePayload(data);

    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        payload.branchId = Number(accessContext.authorizedBranchId);
    }

    if (payload.batchIds && payload.batchIds.length > 0) {
        const [batchRows] = await pool.query(
            `SELECT branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND id = ? LIMIT 1`,
            [tenantId, payload.batchIds[0]]
        );
        if (batchRows.length) {
            payload.branchId = batchRows[0].branch_id;
            payload.academicYearId = batchRows[0].academic_year_id;
        }
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

        let initialStatus = 'draft';
        let initialHwStatus = 0;
        const rawStatus = String(data.status ?? payload.status ?? '').toLowerCase().trim();
        if (rawStatus === 'published' || rawStatus === '1' || rawStatus === 'scheduled') {
            initialStatus = payload.assignmentType === 'exam' ? 'scheduled' : 'published';
            initialHwStatus = 1;
        } else if (rawStatus === 'closed' || rawStatus === '2' || rawStatus === 'completed') {
            initialStatus = payload.assignmentType === 'exam' ? 'completed' : 'closed';
            initialHwStatus = 2;
        }

        if (payload.assignmentType === 'assignment') {
            const [insert] = await conn.query(
                `INSERT INTO assignments
                    (tenant_id, branch_id, academic_year_id, batch_id, batch_ids, files, subject_id, title, description,
                     due_date, max_marks, status, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, branchId, academicYear.id, payload.batchIds[0] || null, JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
                 subject.id, payload.title, payload.description, payload.dueDate, payload.maxMarks, initialStatus, userId, userId]
            );
            await conn.commit();
            return { id: `asg-${insert.insertId}` };
        }

        if (payload.assignmentType === 'exam') {
            let meta = {};
            try { meta = JSON.parse(payload.description || '{}'); } catch {}
            const examType = meta.examType || 'Unit Test';
            const passingMarks = meta.passingMarks ?? 40;
            const examDate = payload.dueDate ? String(payload.dueDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
            const [insert] = await conn.query(
                `INSERT INTO exams
                    (tenant_id, branch_id, academic_year_id, subject_id, name, description, exam_type, max_marks,
                     passing_marks, exam_date, start_time, status, files, metadata, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, branchId, academicYear.id, subject.id, payload.title, payload.description,
                 examType, payload.maxMarks || 100, passingMarks, examDate, meta.startTime || null,
                 initialStatus, JSON.stringify(payload.files), JSON.stringify(meta), userId, userId]
            );
            const examId = insert.insertId;
            for (const bId of payload.batchIds) {
                await conn.query(
                    `INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)`,
                    [tenantId, examId, bId]
                );
            }
            await conn.commit();
            return { id: `exam-${examId}` };
        }

        const [insert] = await conn.query(
            `INSERT INTO homeworks
                (tenant_id, branch_id, academic_year_id, subject_id, title, description,
                 assignment_type, batch_ids, files, due_date, max_marks, status, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, 'homework', ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, branchId, academicYear.id, subject.id, payload.title, payload.description,
             JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
             payload.dueDate, payload.maxMarks, initialHwStatus, userId, userId]
        );

        await conn.commit();
        return { id: `hw-${insert.insertId}` };
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
        const entityType = current._entityType;
        const entityId = current.id;

        const payload = normalizeCreatePayload({
            branchId: current.branch_id,
            academicYearId: current.academic_year_id,
            subjectId: current.subject_id,
            title: current.title,
            description: current.description,
            assignmentType: entityType,
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

        if (payload.batchIds && payload.batchIds.length > 0) {
            const [batchRows] = await conn.query(
                `SELECT branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND id = ? LIMIT 1`,
                [tenantId, payload.batchIds[0]]
            );
            if (batchRows.length) {
                payload.branchId = batchRows[0].branch_id;
                payload.academicYearId = batchRows[0].academic_year_id;
            }
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

        let updateStatusStr = null;
        let updateHwStatusNum = null;
        if (data.status !== undefined && data.status !== null) {
            const s = String(data.status).toLowerCase().trim();
            if (s === 'draft' || s === '0') {
                updateStatusStr = 'draft';
                updateHwStatusNum = 0;
            } else if (s === 'published' || s === '1' || s === 'scheduled') {
                updateStatusStr = entityType === 'exam' ? 'scheduled' : 'published';
                updateHwStatusNum = 1;
            } else if (s === 'closed' || s === '2' || s === 'completed') {
                updateStatusStr = entityType === 'exam' ? 'completed' : 'closed';
                updateHwStatusNum = 2;
            }
        }

        if (entityType === 'assignment') {
            await conn.query(
                `UPDATE assignments
                    SET branch_id = ?, academic_year_id = ?, subject_id = ?, title = ?, description = ?,
                        batch_id = ?, batch_ids = ?, files = ?, due_date = ?, max_marks = ?,
                        status = COALESCE(?, status),
                        updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [branchId, academicYear.id, subject.id, payload.title, payload.description,
                 payload.batchIds[0] || null, JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
                 payload.dueDate, payload.maxMarks, updateStatusStr, userId, entityId, tenantId]
            );
        } else if (entityType === 'exam') {
            let meta = {};
            try { meta = JSON.parse(payload.description || '{}'); } catch {}
            const examType = meta.examType || current.exam_type || 'Unit Test';
            const passingMarks = meta.passingMarks ?? current.passing_marks ?? 40;
            const examDate = payload.dueDate ? String(payload.dueDate).slice(0, 10) : (current.exam_date || new Date().toISOString().slice(0, 10));

            await conn.query(
                `UPDATE exams
                    SET branch_id = ?, academic_year_id = ?, subject_id = ?, name = ?, description = ?,
                        exam_type = ?, max_marks = ?, passing_marks = ?, exam_date = ?,
                        files = ?, metadata = ?, status = COALESCE(?, status), updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [branchId, academicYear.id, subject.id, payload.title, payload.description,
                 examType, payload.maxMarks || 100, passingMarks, examDate,
                 JSON.stringify(payload.files), JSON.stringify(meta), updateStatusStr, userId, entityId, tenantId]
            );
            await conn.query('DELETE FROM exam_batch_assignments WHERE exam_id = ?', [entityId]);
            for (const bId of payload.batchIds) {
                await conn.query(
                    'INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)',
                    [tenantId, entityId, bId]
                );
            }
        } else {
            await conn.query(
                `UPDATE homeworks
                    SET branch_id = ?, academic_year_id = ?, subject_id = ?, title = ?, description = ?,
                        assignment_type = 'homework', batch_ids = ?, files = ?, due_date = ?, max_marks = ?,
                        status = COALESCE(?, status),
                        updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND deleted_at IS NULL`,
                [branchId, academicYear.id, subject.id, payload.title, payload.description,
                 JSON.stringify(payload.batchIds), JSON.stringify(payload.files),
                 payload.dueDate, payload.maxMarks, updateHwStatusNum, userId, current.id]
            );
        }

        await conn.commit();
        return { id: String(id) };
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
        const entityType = current._entityType;
        const entityId = current.id;
        const currentNorm = formatStatus(current.status).toLowerCase();

        if (currentNorm === 'published') {
            await conn.rollback();
            return 'active';
        }

        if (entityType === 'assignment') {
            await conn.query(
                `UPDATE assignments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [entityId, tenantId]
            );
        } else if (entityType === 'exam') {
            await conn.query(
                `UPDATE exams SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [entityId, tenantId]
            );
        } else {
            await conn.query(
                `UPDATE homeworks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND deleted_at IS NULL`,
                [Number(entityId)]
            );
        }

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
        const entityType = current._entityType;
        const entityId = current.id;
        const currentNorm = formatStatus(current.status).toLowerCase();

        if (currentNorm === 'closed') {
            await conn.rollback();
            return 'closed';
        }
        if (currentNorm === 'published') {
            await conn.commit();
            return 'published';
        }

        if (entityType === 'assignment') {
            await conn.query(
                `UPDATE assignments
                    SET status = 'published', updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [userId, entityId, tenantId]
            );
        } else if (entityType === 'exam') {
            await conn.query(
                `UPDATE exams
                    SET status = 'scheduled', updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [userId, entityId, tenantId]
            );
        } else {
            await conn.query(
                `UPDATE homeworks
                    SET status = 1, published_at = CURRENT_TIMESTAMP,
                        updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND deleted_at IS NULL`,
                [userId, Number(entityId)]
            );
        }

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
        const entityType = current._entityType;
        const entityId = current.id;
        const currentNorm = formatStatus(current.status).toLowerCase();

        if (currentNorm !== 'published') {
            await conn.rollback();
            return 'not_published';
        }

        if (entityType === 'assignment') {
            await conn.query(
                `UPDATE assignments
                    SET status = 'closed', updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [userId, entityId, tenantId]
            );
        } else if (entityType === 'exam') {
            await conn.query(
                `UPDATE exams
                    SET status = 'completed', updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND tenant_id = ?`,
                [userId, entityId, tenantId]
            );
        } else {
            await conn.query(
                `UPDATE homeworks
                    SET status = 2, closed_at = CURRENT_TIMESTAMP,
                        updated_by = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND deleted_at IS NULL`,
                [userId, Number(entityId)]
            );
        }

        await conn.commit();
        return 'closed';
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const titleize = (str) => {
    if (!str) return 'Pending';
    const s = String(str).trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const getSubmissions = async (tenantId, homeworkId, accessContext = null) => {
    const hw = await assertHomeworkAccess(null, tenantId, homeworkId, accessContext);
    const entityType = hw._entityType;
    const entityId = hw.id;

    let rows = [];
    if (entityType === 'assignment') {
        const [subRows] = await pool.query(
            `SELECT asub.id, asub.assignment_id AS homework_id, asub.student_id, asub.response_text,
                    asub.files, asub.status, asub.marks_obtained, asub.teacher_feedback,
                    asub.submitted_at, asub.graded_at, st.full_name AS student_name, st.student_code
               FROM assignment_submissions asub
               JOIN students st ON st.id = asub.student_id
              WHERE asub.tenant_id = ? AND asub.assignment_id = ? AND asub.deleted_at IS NULL
              ORDER BY asub.submitted_at ASC`,
            [tenantId, entityId]
        );
        rows = subRows;
    } else if (entityType === 'exam') {
        const [subRows] = await pool.query(
            `SELECT em.id, em.exam_id AS homework_id, em.student_id, '' AS response_text,
                    '[]' AS files, em.status, em.marks_obtained, em.remarks AS teacher_feedback,
                    em.created_at AS submitted_at, em.updated_at AS graded_at,
                    st.full_name AS student_name, st.student_code
               FROM exam_marks em
               JOIN students st ON st.id = em.student_id
              WHERE em.tenant_id = ? AND em.exam_id = ? AND em.deleted_at IS NULL
              ORDER BY em.created_at ASC`,
            [tenantId, entityId]
        );
        rows = subRows;
    } else {
        const [subRows] = await pool.query(
            `SELECT hs.id, hs.homework_id, hs.student_id, hs.response_text, hs.files, hs.status,
                    hs.marks_obtained, hs.teacher_feedback, hs.submitted_at, hs.graded_at,
                    st.full_name AS student_name, st.student_code
               FROM homework_submissions hs
               JOIN students st ON st.id = hs.student_id
              WHERE hs.tenant_id = ? AND hs.homework_id = ? AND hs.deleted_at IS NULL
              ORDER BY hs.submitted_at ASC`,
            [tenantId, entityId]
        );
        rows = subRows;
    }

    return {
        homework: { id: String(homeworkId), status: formatStatus(hw.status) },
        submissions: rows.map(r => ({
            id: String(r.id),
            homeworkId: String(homeworkId),
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
        const entityType = hw._entityType;
        const entityId = hw.id;

        let subId = Number(submissionId);
        let studentId = safeNumber(data.studentId ?? data.student_id);
        if (!studentId && subId && !isNaN(subId)) {
            const [stRows] = await conn.query(
                `SELECT id FROM students WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1`,
                [tenantId, subId]
            );
            if (stRows.length) studentId = subId;
        }
        const marks = safeNumber(data.marks_obtained ?? data.marksObtained);
        const feedback = data.teacher_feedback ?? data.feedback ?? '';

        if (marks === null) {
            await conn.rollback();
            const error = new Error('Marks are required for grading');
            error.code = 'ER_HW_MARKS_REQUIRED';
            throw error;
        }

        if (entityType === 'assignment') {
            let existingSub = null;
            if (subId && !isNaN(subId)) {
                const [rows] = await conn.query(
                    `SELECT id, student_id, enrollment_id FROM assignment_submissions
                      WHERE tenant_id = ? AND assignment_id = ? AND id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, subId]
                );
                if (rows.length) existingSub = rows[0];
            }
            if (!existingSub && studentId) {
                const [rows] = await conn.query(
                    `SELECT id, student_id, enrollment_id FROM assignment_submissions
                      WHERE tenant_id = ? AND assignment_id = ? AND student_id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, studentId]
                );
                if (rows.length) existingSub = rows[0];
            }

            if (existingSub) {
                await conn.query(
                    `UPDATE assignment_submissions
                        SET marks_obtained = ?, teacher_feedback = ?, status = 'graded',
                            graded_by = ?, graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?`,
                    [marks, String(feedback), userId, existingSub.id]
                );
                await conn.commit();
                return { id: String(existingSub.id) };
            } else if (studentId) {
                const [enrRows] = await conn.query(
                    `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                    [tenantId, studentId]
                );
                const enrId = enrRows.length ? enrRows[0].id : null;
                const [ins] = await conn.query(
                    `INSERT INTO assignment_submissions
                        (tenant_id, assignment_id, enrollment_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at)
                     VALUES (?, ?, ?, ?, 'graded', ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
                    [tenantId, entityId, enrId, studentId, marks, String(feedback), userId]
                );
                await conn.commit();
                return { id: String(ins.insertId) };
            }
        } else if (entityType === 'exam') {
            let existingSub = null;
            if (subId && !isNaN(subId)) {
                const [rows] = await conn.query(
                    `SELECT id, student_id, enrollment_id FROM exam_marks
                      WHERE tenant_id = ? AND exam_id = ? AND id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, subId]
                );
                if (rows.length) existingSub = rows[0];
            }
            if (!existingSub && studentId) {
                const [rows] = await conn.query(
                    `SELECT id, student_id, enrollment_id FROM exam_marks
                      WHERE tenant_id = ? AND exam_id = ? AND student_id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, studentId]
                );
                if (rows.length) existingSub = rows[0];
            }

            if (existingSub) {
                await conn.query(
                    `UPDATE exam_marks
                        SET marks_obtained = ?, remarks = ?, status = 'graded',
                            updated_by = ?, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?`,
                    [marks, String(feedback), userId, existingSub.id]
                );
                await conn.commit();
                return { id: String(existingSub.id) };
            } else if (studentId) {
                const [enrRows] = await conn.query(
                    `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                    [tenantId, studentId]
                );
                const enrId = enrRows.length ? enrRows[0].id : null;
                const [ins] = await conn.query(
                    `INSERT INTO exam_marks
                        (tenant_id, exam_id, enrollment_id, student_id, marks_obtained, is_absent, remarks, is_result_visible, status, created_by, updated_by, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, 0, ?, 1, 'graded', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [tenantId, entityId, enrId, studentId, marks, String(feedback), userId, userId]
                );
                await conn.commit();
                return { id: String(ins.insertId) };
            }
        } else {
            let existingSub = null;
            if (subId && !isNaN(subId)) {
                const [rows] = await conn.query(
                    `SELECT id, student_id FROM homework_submissions
                      WHERE tenant_id = ? AND homework_id = ? AND id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, subId]
                );
                if (rows.length) existingSub = rows[0];
            }
            if (!existingSub && studentId) {
                const [rows] = await conn.query(
                    `SELECT id, student_id FROM homework_submissions
                      WHERE tenant_id = ? AND homework_id = ? AND student_id = ? AND deleted_at IS NULL`,
                    [tenantId, entityId, studentId]
                );
                if (rows.length) existingSub = rows[0];
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
                    [tenantId, entityId, studentId, marks, String(feedback), userId]
                );
                await conn.commit();
                return { id: String(ins.insertId) };
            }
        }

        await conn.rollback();
        return null;
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
        const entityType = hw._entityType;
        const entityId = hw.id;

        const maxMarks = hw.max_marks !== null && hw.max_marks !== undefined ? Number(hw.max_marks) : null;
        const batchIds = parseJsonArray(hw.batch_ids).map(Number).filter(Boolean);

        // Fetch all valid enrolled students in these batches
        const [studentRows] = await conn.query(
            `SELECT DISTINCT st.id, st.student_code, se.id AS enrollment_id
               FROM student_enrollments se
               JOIN students st ON st.id = se.student_id AND st.tenant_id = ? AND st.deleted_at IS NULL
              WHERE se.tenant_id = ? AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL`,
            [tenantId, tenantId, batchIds.length ? batchIds : [0]]
        );

        const studentCodeMap = new Map();
        const studentIdMap = new Map();
        const studentEnrollmentMap = new Map();

        studentRows.forEach(st => {
            if (st.student_code) {
                studentCodeMap.set(String(st.student_code).trim().toLowerCase(), Number(st.id));
            }
            studentIdMap.set(String(st.id), Number(st.id));
            studentEnrollmentMap.set(Number(st.id), Number(st.enrollment_id));
        });

        // Load existing submissions map
        let existingSubMap = new Map();
        if (entityType === 'assignment') {
            const [existing] = await conn.query(
                `SELECT id, student_id FROM assignment_submissions WHERE tenant_id = ? AND assignment_id = ? AND deleted_at IS NULL`,
                [tenantId, entityId]
            );
            existingSubMap = new Map(existing.map(s => [Number(s.student_id), Number(s.id)]));
        } else if (entityType === 'exam') {
            const [existing] = await conn.query(
                `SELECT id, student_id FROM exam_marks WHERE tenant_id = ? AND exam_id = ? AND deleted_at IS NULL`,
                [tenantId, entityId]
            );
            existingSubMap = new Map(existing.map(s => [Number(s.student_id), Number(s.id)]));
        } else {
            const [existing] = await conn.query(
                `SELECT id, student_id FROM homework_submissions WHERE tenant_id = ? AND homework_id = ? AND deleted_at IS NULL`,
                [tenantId, entityId]
            );
            existingSubMap = new Map(existing.map(s => [Number(s.student_id), Number(s.id)]));
        }

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
            const enrollmentId = studentEnrollmentMap.get(studentId) || null;

            if (entityType === 'assignment') {
                if (existingSubId) {
                    await conn.query(
                        `UPDATE assignment_submissions
                            SET marks_obtained = ?, teacher_feedback = ?, status = 'graded',
                                graded_by = ?, graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                          WHERE id = ?`,
                        [marks, feedback, userId, existingSubId]
                    );
                } else {
                    const [ins] = await conn.query(
                        `INSERT INTO assignment_submissions
                            (tenant_id, assignment_id, enrollment_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at)
                         VALUES (?, ?, ?, ?, 'graded', ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
                        [tenantId, entityId, enrollmentId, studentId, marks, feedback, userId]
                    );
                    existingSubMap.set(studentId, ins.insertId);
                }
            } else if (entityType === 'exam') {
                if (existingSubId) {
                    await conn.query(
                        `UPDATE exam_marks
                            SET marks_obtained = ?, remarks = ?, status = 'graded',
                                updated_by = ?, updated_at = CURRENT_TIMESTAMP
                          WHERE id = ?`,
                        [marks, feedback, userId, existingSubId]
                    );
                } else {
                    const [ins] = await conn.query(
                        `INSERT INTO exam_marks
                            (tenant_id, exam_id, enrollment_id, student_id, marks_obtained, is_absent, remarks, is_result_visible, status, created_by, updated_by, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 0, ?, 1, 'graded', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [tenantId, entityId, enrollmentId, studentId, marks, feedback, userId, userId]
                    );
                    existingSubMap.set(studentId, ins.insertId);
                }
            } else {
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
                        [tenantId, entityId, studentId, marks, feedback, userId]
                    );
                    existingSubMap.set(studentId, ins.insertId);
                }
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
    if (!enrolledBatchIds.length) return [];

    const allAssessments = [];

    // 1. Homeworks
    const [hwRows] = await pool.query(
        `${HOMEWORK_SELECT}
         WHERE hw.tenant_id = ? AND hw.deleted_at IS NULL AND hw.status IN (1, 2, 'published', 'closed')`,
        [tenantId]
    );
    hwRows.forEach(r => allAssessments.push({ ...r, custom_id: `hw-${r.id}`, assignment_type: 'homework' }));

    // 2. Assignments
    const [asgRows] = await pool.query(
        `SELECT a.id, a.tenant_id, a.branch_id, a.academic_year_id,
                COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)) AS batch_ids,
                a.files, a.subject_id, a.title, a.description, a.due_date, a.max_marks,
                a.status, a.created_at, a.updated_at,
                s.name AS subject_name, s.code AS subject_code,
                b.name AS branch_name, ay.name AS academic_year_name
         FROM assignments a
         LEFT JOIN subjects s ON s.id = a.subject_id
         LEFT JOIN branches b ON b.id = a.branch_id
         LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
         WHERE a.tenant_id = ? AND a.deleted_at IS NULL AND a.status IN ('published', 'closed')`,
        [tenantId]
    );
    asgRows.forEach(r => allAssessments.push({ ...r, custom_id: `asg-${r.id}`, assignment_type: 'assignment' }));

    // 3. Exams
    const [examRows] = await pool.query(
        `SELECT e.id, e.tenant_id, e.branch_id, e.academic_year_id, e.subject_id,
                e.name AS title, e.description, e.exam_date AS due_date, e.max_marks,
                e.status, e.files, e.created_at, e.updated_at,
                s.name AS subject_name, s.code AS subject_code,
                b.name AS branch_name, ay.name AS academic_year_name,
                (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) AS batch_ids
         FROM exams e
         LEFT JOIN subjects s ON s.id = e.subject_id
         LEFT JOIN branches b ON b.id = e.branch_id
         LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
         WHERE e.tenant_id = ? AND e.deleted_at IS NULL AND e.status IN ('scheduled', 'completed', 'published', 'closed')`,
        [tenantId]
    );
    examRows.forEach(r => allAssessments.push({ ...r, custom_id: `exam-${r.id}`, assignment_type: 'exam' }));

    // Filter to assessments targeting student's enrolled batches
    const matchedAssessments = allAssessments.filter(r => {
        const batchIds = parseJsonArray(r.batch_ids).map(Number);
        return batchIds.some(id => enrolledBatchIds.includes(id));
    });

    if (!matchedAssessments.length) return [];

    // Fetch submissions across the 3 tables
    const [hwSubs] = await pool.query(
        `SELECT homework_id, status, marks_obtained, teacher_feedback, submitted_at
           FROM homework_submissions
          WHERE tenant_id = ? AND student_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(studentId)]
    );
    const hwSubMap = new Map(hwSubs.map(s => [Number(s.homework_id), s]));

    const [asgSubs] = await pool.query(
        `SELECT assignment_id, status, marks_obtained, teacher_feedback, submitted_at
           FROM assignment_submissions
          WHERE tenant_id = ? AND student_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(studentId)]
    );
    const asgSubMap = new Map(asgSubs.map(s => [Number(s.assignment_id), s]));

    const [examMarks] = await pool.query(
        `SELECT exam_id, status, marks_obtained, remarks AS teacher_feedback, created_at AS submitted_at
           FROM exam_marks
          WHERE tenant_id = ? AND student_id = ? AND deleted_at IS NULL`,
        [tenantId, Number(studentId)]
    );
    const examMarksMap = new Map(examMarks.map(s => [Number(s.exam_id), s]));

    // Batch names map
    const allBatchIds = [...new Set(matchedAssessments.flatMap(r => parseJsonArray(r.batch_ids).map(Number)))];
    const batchNamesById = new Map();
    if (allBatchIds.length) {
        const [batchRows] = await pool.query(
            `SELECT id, name FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (?)`,
            [tenantId, allBatchIds]
        );
        batchRows.forEach(br => batchNamesById.set(Number(br.id), br.name));
    }

    return matchedAssessments.map(r => {
        let sub = null;
        if (r.assignment_type === 'assignment') sub = asgSubMap.get(Number(r.id));
        else if (r.assignment_type === 'exam') sub = examMarksMap.get(Number(r.id));
        else sub = hwSubMap.get(Number(r.id));

        return {
            ...rowToHomework({
                ...r,
                id: r.custom_id,
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
    return list.find(h => h.id === String(id) || String(h.id).endsWith(`-${id}`)) || null;
};

const submitHomework = async (tenantId, studentId, homeworkId, data) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const enrolledBatchIds = await getStudentEnrolledBatchIds(tenantId, studentId);
        const hw = await assertHomeworkAccess(conn, tenantId, homeworkId);
        const entityType = hw._entityType;
        const entityId = hw.id;

        const currentNorm = formatStatus(hw.status).toLowerCase();
        if (currentNorm !== 'published') {
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

        if (entityType === 'assignment') {
            const [enrRows] = await conn.query(
                `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                [tenantId, Number(studentId)]
            );
            const enrollmentId = enrRows.length ? enrRows[0].id : null;

            await conn.query(
                `INSERT INTO assignment_submissions
                    (tenant_id, assignment_id, enrollment_id, student_id, response_text, files, status, submitted_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
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
                [tenantId, entityId, enrollmentId, Number(studentId), responseText, JSON.stringify(fileUrls)]
            );
        } else if (entityType === 'exam') {
            // Exams are primarily recorded by teachers, but if a student submits exam materials:
            const [enrRows] = await conn.query(
                `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                [tenantId, Number(studentId)]
            );
            const enrollmentId = enrRows.length ? enrRows[0].id : null;

            await conn.query(
                `INSERT INTO exam_marks
                    (tenant_id, exam_id, enrollment_id, student_id, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE
                    status = 'submitted',
                    updated_at = CURRENT_TIMESTAMP`,
                [tenantId, entityId, enrollmentId, Number(studentId)]
            );
        } else {
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
                [tenantId, entityId, Number(studentId), responseText, JSON.stringify(fileUrls)]
            );
        }

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
    const entityType = hw._entityType;
    const entityId = hw.id;

    const batchIds = parseJsonArray(hw.batch_ids).map(Number).filter(Boolean);

    if (!batchIds.length) {
        return { homework: { id: String(homeworkId), status: formatStatus(hw.status), maxMarks: hw.max_marks }, students: [] };
    }

    const [batchRows] = await pool.query(
        `SELECT id, name FROM batches WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL`,
        [tenantId, batchIds]
    );
    const batchNameMap = Object.fromEntries(batchRows.map(b => [b.id, b.name]));

    let query = '';
    if (entityType === 'assignment') {
        query = `
            SELECT
                se.student_id,
                se.batch_id,
                st.full_name     AS student_name,
                st.student_code,
                asub.id          AS submission_id,
                asub.status      AS submission_status,
                asub.response_text,
                asub.files       AS submission_files,
                asub.marks_obtained,
                asub.teacher_feedback,
                asub.submitted_at,
                asub.graded_at
             FROM student_enrollments se
             JOIN students st ON st.id = se.student_id AND st.tenant_id = ? AND st.deleted_at IS NULL
             LEFT JOIN assignment_submissions asub
               ON asub.assignment_id = ? AND (asub.student_id = se.student_id OR asub.enrollment_id = se.id) AND asub.deleted_at IS NULL
            WHERE se.tenant_id = ? AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL
            ORDER BY se.batch_id, st.full_name`;
    } else if (entityType === 'exam') {
        query = `
            SELECT
                se.student_id,
                se.batch_id,
                st.full_name     AS student_name,
                st.student_code,
                em.id            AS submission_id,
                em.status        AS submission_status,
                ''               AS response_text,
                '[]'             AS submission_files,
                em.marks_obtained,
                em.remarks       AS teacher_feedback,
                em.created_at    AS submitted_at,
                em.updated_at    AS graded_at
             FROM student_enrollments se
             JOIN students st ON st.id = se.student_id AND st.tenant_id = ? AND st.deleted_at IS NULL
             LEFT JOIN exam_marks em
               ON em.exam_id = ? AND (em.student_id = se.student_id OR em.enrollment_id = se.id) AND em.deleted_at IS NULL
            WHERE se.tenant_id = ? AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL
            ORDER BY se.batch_id, st.full_name`;
    } else {
        query = `
            SELECT
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
            ORDER BY se.batch_id, st.full_name`;
    }

    const [rows] = await pool.query(query, [tenantId, entityId, tenantId, batchIds]);

    return {
        homework: { id: String(homeworkId), status: formatStatus(hw.status), maxMarks: hw.max_marks },
        students: rows.map(r => ({
            studentId: String(r.student_id),
            studentName: r.student_name,
            studentCode: r.student_code || '',
            batchId: String(r.batch_id),
            batchName: batchNameMap[r.batch_id] || '',
            submissionId: r.submission_id ? String(r.submission_id) : null,
            submissionStatus: r.submission_status ? titleize(r.submission_status) : null,
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