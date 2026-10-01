const pool = require('../config/db');
const teacherAcademicScopeService = require('./teacherAcademicScopeService');

const STATUS_MAP = {
    0: 'Draft',
    1: 'Published',
    2: 'Closed'
};

const formatStatus = (status) => {
    const num = Number(status);
    if (num in STATUS_MAP) return STATUS_MAP[num];
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

class TeacherHomeworkService {
    /**
     * Get scoping options (Batches, Subjects, Academic Years) strictly for the teacher.
     */
    async getScoping(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { batchIds, subjectIds } = await teacherAcademicScopeService.getTeacherAllocations(tid, uid);

        if (batchIds.length === 0) {
            return {
                branches: [],
                batches: [],
                subjects: [],
                academicYears: []
            };
        }

        // 1. Batches
        const [batches] = await pool.query(
            `SELECT b.id, b.name, b.code, b.branch_id, b.level_id, b.academic_year_id,
                    ay.name AS academic_year_name, l.name AS level_name, br.name AS branch_name
             FROM batches b
             LEFT JOIN academic_years ay ON ay.id = b.academic_year_id
             LEFT JOIN levels l ON l.id = b.level_id
             LEFT JOIN branches br ON br.id = b.branch_id
             WHERE b.tenant_id = ? AND b.id IN (?) AND b.deleted_at IS NULL
             ORDER BY b.name ASC`,
            [tid, batchIds]
        );

        // 2. Subjects
        let subjects = [];
        if (subjectIds.length > 0) {
            const [subjectRows] = await pool.query(
                `SELECT id, name, code, type
                 FROM subjects
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, subjectIds]
            );
            subjects = subjectRows;
        } else {
            const [allSubjects] = await pool.query(
                `SELECT id, name, code, type
                 FROM subjects
                 WHERE tenant_id = ? AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid]
            );
            subjects = allSubjects;
        }

        // 3. Academic Years derived from batches
        const academicYearIds = Array.from(new Set(batches.map(b => b.academic_year_id).filter(Boolean)));
        let academicYears = [];
        if (academicYearIds.length > 0) {
            const [yearRows] = await pool.query(
                `SELECT id, name, start_date, end_date, status
                 FROM academic_years
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY start_date DESC`,
                [tid, academicYearIds]
            );
            academicYears = yearRows;
        }

        // 4. Branches derived from batches & allocations
        const branchIds = Array.from(new Set(batches.map(b => b.branch_id).filter(Boolean)));
        let branches = [];
        if (branchIds.length > 0) {
            const [branchRows] = await pool.query(
                `SELECT id, name, code
                 FROM branches
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, branchIds]
            );
            branches = branchRows;
        }

        return {
            branches: branches.map(br => ({
                id: br.id,
                name: br.name,
                code: br.code || ''
            })),
            batches: batches.map(b => ({
                id: b.id,
                name: b.name,
                code: b.code || '',
                branchId: b.branch_id,
                branchName: b.branch_name || '',
                academicYearId: b.academic_year_id,
                academicYearName: b.academic_year_name || '',
                levelId: b.level_id,
                levelName: b.level_name || ''
            })),
            subjects: subjects.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code || '',
                type: s.type || 'Core'
            })),
            academicYears: academicYears.map(ay => ({
                id: ay.id,
                name: ay.name,
                status: ay.status
            }))
        };
    }

    /**
     * List homeworks/assignments/exams scoped to teacher allocations across separate tables.
     */
    async getHomeworks(tenantId, teacherUserId, params = {}) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { batchIds: allowedBatchIds, subjectIds: allowedSubjectIds } = await teacherAcademicScopeService.getTeacherAllocations(tid, uid);

        if (allowedBatchIds.length === 0 || allowedSubjectIds.length === 0) {
            return {
                data: [],
                pagination: { total: 0, page: Number(params.page || 1), limit: Number(params.limit || 20), totalPages: 1 }
            };
        }

        const page = Math.max(1, parseInt(params.page, 10) || 1);
        const limit = params.limit ? Math.max(1, Math.min(1000, parseInt(params.limit, 10))) : 1000;
        const offset = (page - 1) * limit;

        const reqType = String(params.assignmentType || 'all').toLowerCase().trim();
        const rows = [];

        // 1. Fetch from homeworks
        if (reqType === 'all' || reqType === 'homework') {
            const hwBatchOrConditions = allowedBatchIds.map(() => `JSON_CONTAINS(h.batch_ids, CAST(? AS JSON))`).join(' OR ');
            const [hwRows] = await pool.query(
                `SELECT h.id, h.tenant_id, h.branch_id, h.academic_year_id, h.subject_id,
                        h.title, h.description, 'homework' AS assignment_type,
                        h.batch_ids, h.files, h.due_date, h.max_marks, h.status,
                        h.published_at, h.closed_at, h.created_at, h.updated_at,
                        'hw-' AS id_prefix,
                        s.name AS subject_name, s.code AS subject_code,
                        ay.name AS academic_year_name, br.name AS branch_name,
                        (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.deleted_at IS NULL) AS submitted_count,
                        (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND (hs.status = 'graded' OR hs.status = 'Graded' OR hs.marks_obtained IS NOT NULL) AND hs.deleted_at IS NULL) AS graded_submissions_count,
                        (SELECT AVG((hs.marks_obtained / NULLIF(h.max_marks, 0)) * 100) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.marks_obtained IS NOT NULL AND hs.deleted_at IS NULL) AS class_average_percentage
                 FROM homeworks h
                 LEFT JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
                 LEFT JOIN academic_years ay ON ay.id = h.academic_year_id AND ay.deleted_at IS NULL
                 LEFT JOIN branches br ON br.id = h.branch_id AND br.deleted_at IS NULL
                 WHERE h.tenant_id = ? AND h.deleted_at IS NULL
                   AND (${hwBatchOrConditions})
                   AND h.subject_id IN (?)`,
                [tid, ...allowedBatchIds, allowedSubjectIds]
            );
            rows.push(...hwRows);
        }

        // 2. Fetch from assignments
        if (reqType === 'all' || reqType === 'assignment') {
            const asgBatchOrConditions = allowedBatchIds.map(() => `JSON_CONTAINS(COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)), CAST(? AS JSON))`).join(' OR ');
            const [asgRows] = await pool.query(
                `SELECT a.id, a.tenant_id, a.branch_id, a.academic_year_id, a.subject_id,
                        a.title, a.description, 'assignment' AS assignment_type,
                        COALESCE(a.batch_ids, JSON_ARRAY(a.batch_id)) AS batch_ids,
                        a.files, a.due_date, a.max_marks, a.status,
                        NULL AS published_at, NULL AS closed_at, a.created_at, a.updated_at,
                        'asg-' AS id_prefix,
                        s.name AS subject_name, s.code AS subject_code,
                        ay.name AS academic_year_name, br.name AS branch_name,
                        (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.assignment_id = a.id AND asub.deleted_at IS NULL) AS submitted_count,
                        (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.assignment_id = a.id AND (asub.status = 'graded' OR asub.status = 'Graded' OR asub.marks_obtained IS NOT NULL) AND asub.deleted_at IS NULL) AS graded_submissions_count,
                        (SELECT AVG((asub.marks_obtained / NULLIF(a.max_marks, 0)) * 100) FROM assignment_submissions asub WHERE asub.assignment_id = a.id AND asub.marks_obtained IS NOT NULL AND asub.deleted_at IS NULL) AS class_average_percentage
                 FROM assignments a
                 LEFT JOIN subjects s ON s.id = a.subject_id AND s.deleted_at IS NULL
                 LEFT JOIN academic_years ay ON ay.id = a.academic_year_id AND ay.deleted_at IS NULL
                 LEFT JOIN branches br ON br.id = a.branch_id AND br.deleted_at IS NULL
                 WHERE a.tenant_id = ? AND a.deleted_at IS NULL
                   AND (${asgBatchOrConditions})
                   AND a.subject_id IN (?)`,
                [tid, ...allowedBatchIds, allowedSubjectIds]
            );
            rows.push(...asgRows);
        }

        // 3. Fetch from exams
        if (reqType === 'all' || reqType === 'exam') {
            const [examRows] = await pool.query(
                `SELECT e.id, e.tenant_id, e.branch_id, e.academic_year_id, e.subject_id,
                        e.name AS title, e.description, 'exam' AS assignment_type,
                        (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) AS batch_ids,
                        e.files, e.exam_date AS due_date, e.max_marks, e.status,
                        NULL AS published_at, NULL AS closed_at, e.created_at, e.updated_at,
                        'exam-' AS id_prefix,
                        s.name AS subject_name, s.code AS subject_code,
                        ay.name AS academic_year_name, br.name AS branch_name,
                        (SELECT COUNT(*) FROM exam_marks em WHERE em.exam_id = e.id AND em.deleted_at IS NULL) AS submitted_count,
                        (SELECT COUNT(*) FROM exam_marks em WHERE em.exam_id = e.id AND em.marks_obtained IS NOT NULL AND em.deleted_at IS NULL) AS graded_submissions_count,
                        (SELECT AVG((em.marks_obtained / NULLIF(e.max_marks, 0)) * 100) FROM exam_marks em WHERE em.exam_id = e.id AND em.marks_obtained IS NOT NULL AND em.deleted_at IS NULL) AS class_average_percentage
                 FROM exams e
                 LEFT JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
                 LEFT JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.deleted_at IS NULL
                 LEFT JOIN branches br ON br.id = e.branch_id AND br.deleted_at IS NULL
                 WHERE e.tenant_id = ? AND e.deleted_at IS NULL
                   AND EXISTS (SELECT 1 FROM exam_batch_assignments eba WHERE eba.exam_id = e.id AND eba.batch_id IN (?))
                   AND e.subject_id IN (?)`,
                [tid, allowedBatchIds, allowedSubjectIds]
            );
            rows.push(...examRows);
        }

        // Fetch batches to build names and total students per batch
        const allTargetBatchIds = Array.from(new Set(
            rows.flatMap(r => parseJsonArray(r.batch_ids).map(Number)).filter(Boolean)
        ));

        let batchMap = new Map();
        let batchStudentCountMap = new Map();

        if (allTargetBatchIds.length > 0) {
            const [batchRows] = await pool.query(
                `SELECT id, name, code FROM batches WHERE tenant_id = ? AND id IN (?)`,
                [tid, allTargetBatchIds]
            );
            batchRows.forEach(b => batchMap.set(b.id, b.name));

            const [enrollmentCounts] = await pool.query(
                `SELECT batch_id, COUNT(DISTINCT student_id) AS cnt
                 FROM student_enrollments
                 WHERE tenant_id = ? AND status = 'active' AND deleted_at IS NULL AND batch_id IN (?)
                 GROUP BY batch_id`,
                [tid, allTargetBatchIds]
            );
            enrollmentCounts.forEach(ec => batchStudentCountMap.set(Number(ec.batch_id), Number(ec.cnt)));
        }

        // Filter in-memory for optional filters
        const filtered = rows.filter(r => {
            const rBatchIds = parseJsonArray(r.batch_ids).map(Number).filter(Boolean);

            // Filter batchId
            if (params.batchId && params.batchId !== 'All' && params.batchId !== '') {
                const requestedBatchId = Number(params.batchId);
                if (!rBatchIds.includes(requestedBatchId)) return false;
            }

            // Filter subjectId
            if (params.subjectId && params.subjectId !== 'All' && params.subjectId !== '') {
                if (Number(r.subject_id) !== Number(params.subjectId)) return false;
            }

            // Filter status
            if (params.status !== undefined && params.status !== 'All' && params.status !== '') {
                const reqStatusNorm = formatStatus(params.status).toLowerCase();
                if (formatStatus(r.status).toLowerCase() !== reqStatusNorm) return false;
            }

            // Filter academicYearId
            if (params.academicYearId && params.academicYearId !== 'All' && params.academicYearId !== '') {
                if (Number(r.academic_year_id) !== Number(params.academicYearId)) return false;
            }

            // Search title or description
            if (params.search && params.search.trim() !== '') {
                const term = params.search.trim().toLowerCase();
                const titleMatch = (r.title || '').toLowerCase().includes(term);
                const descMatch = (r.description || '').toLowerCase().includes(term);
                if (!titleMatch && !descMatch) return false;
            }

            return true;
        });

        // Sort by due_date DESC, id DESC
        filtered.sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;
            return Number(b.id) - Number(a.id);
        });

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const pageRows = filtered.slice(offset, offset + limit);

        const data = pageRows.map(r => {
            const bIds = parseJsonArray(r.batch_ids).map(Number).filter(Boolean);
            const batchNames = bIds.map(id => batchMap.get(id) || `Batch ${id}`);
            const files = parseJsonArray(r.files);
            const totalStudents = bIds.reduce((sum, bid) => sum + (batchStudentCountMap.get(bid) || 0), 0);

            return {
                id: `${r.id_prefix || ''}${r.id}`,
                rawId: Number(r.id),
                title: r.title,
                description: r.description || '',
                assignmentType: r.assignment_type || 'assignment',
                subjectId: r.subject_id,
                subjectName: r.subject_name || '',
                subjectCode: r.subject_code || '',
                branchId: r.branch_id,
                branchName: r.branch_name || '',
                academicYearId: r.academic_year_id,
                academicYearName: r.academic_year_name || '',
                batchIds: bIds,
                batchNames,
                files,
                dueDate: formatDueDate(r.due_date),
                dueDateTime: formatDueDateTime(r.due_date),
                maxMarks: r.max_marks !== null && r.max_marks !== undefined ? Number(r.max_marks) : null,
                status: formatStatus(r.status),
                statusCode: getStatusCode(r.status),
                publishedAt: r.published_at || null,
                closedAt: r.closed_at || null,
                submittedCount: Number(r.submitted_count || 0),
                gradedSubmissionsCount: Number(r.graded_submissions_count || 0),
                classAveragePercentage: r.class_average_percentage !== null && r.class_average_percentage !== undefined
                    ? Number(Number(r.class_average_percentage).toFixed(1))
                    : null,
                totalCount: totalStudents,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
        });

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }

    /**
     * Get single assessment details by ID across tables.
     */
    async getHomeworkById(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework, homeworkBatchIds } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        // Fetch batch details
        let batchNames = [];
        let totalStudents = 0;
        if (homeworkBatchIds.length > 0) {
            const [batchRows] = await pool.query(
                `SELECT id, name, code FROM batches WHERE tenant_id = ? AND id IN (?)`,
                [tid, homeworkBatchIds]
            );
            batchNames = batchRows.map(b => b.name);

            const [countRows] = await pool.query(
                `SELECT COUNT(DISTINCT student_id) AS total
                 FROM student_enrollments
                 WHERE tenant_id = ? AND status = 'active' AND deleted_at IS NULL AND batch_id IN (?)`,
                [tid, homeworkBatchIds]
            );
            totalStudents = Number(countRows[0]?.total || 0);
        }

        // Submissions count based on entity type
        let submittedCount = 0;
        const entityType = homework._entityType || 'homework';

        if (entityType === 'assignment') {
            const [sub] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM assignment_submissions WHERE assignment_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [homework.id, tid]
            );
            submittedCount = Number(sub[0]?.cnt || 0);
        } else if (entityType === 'exam') {
            const [sub] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM exam_marks WHERE exam_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [homework.id, tid]
            );
            submittedCount = Number(sub[0]?.cnt || 0);
        } else {
            const [sub] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM homework_submissions WHERE homework_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [homework.id, tid]
            );
            submittedCount = Number(sub[0]?.cnt || 0);
        }

        const idPrefix = entityType === 'assignment' ? 'asg-' : (entityType === 'exam' ? 'exam-' : 'hw-');

        return {
            id: String(homeworkId).includes('-') ? String(homeworkId) : `${idPrefix}${homework.id}`,
            title: homework.title || homework.name,
            description: homework.description || '',
            assignmentType: homework.assignment_type || entityType,
            subjectId: homework.subject_id,
            subjectName: homework.subject_name || '',
            subjectCode: homework.subject_code || '',
            branchId: homework.branch_id,
            academicYearId: homework.academic_year_id,
            batchIds: homeworkBatchIds,
            batchNames,
            files: parseJsonArray(homework.files),
            dueDate: formatDueDate(homework.due_date),
            dueDateTime: formatDueDateTime(homework.due_date),
            maxMarks: homework.max_marks !== null && homework.max_marks !== undefined ? Number(homework.max_marks) : null,
            status: formatStatus(homework.status),
            statusCode: getStatusCode(homework.status),
            publishedAt: homework.published_at || null,
            closedAt: homework.closed_at || null,
            submittedCount,
            totalCount: totalStudents,
            createdAt: homework.created_at,
            updatedAt: homework.updated_at
        };
    }

    /**
     * Create a new homework/assignment/exam in its dedicated table.
     */
    async createHomework(tenantId, teacherUserId, data, uploadedFilePaths = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const targetBatchIds = parseJsonArray(data.batchIds ?? data.batch_ids).map(Number).filter(Boolean);
        const subjectId = Number(data.subjectId ?? data.subject_id);

        // Authorize target batches and subject
        await teacherAcademicScopeService.validateAssessmentTargets(tid, uid, targetBatchIds, subjectId);

        // Resolve branch_id and academic_year_id from target batches
        const [batchRows] = await pool.query(
            `SELECT branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND id IN (?) LIMIT 1`,
            [tid, targetBatchIds]
        );

        if (!batchRows.length) {
            const err = new Error('Invalid target batch.');
            err.statusCode = 400;
            throw err;
        }

        const branchId = batchRows[0].branch_id;
        const academicYearId = Number(data.academicYearId ?? data.academic_year_id ?? batchRows[0].academic_year_id);

        const rawType = String(data.assignmentType ?? data.assignment_type ?? 'assignment').toLowerCase().trim();
        const assignmentType = ['assignment', 'homework', 'exam'].includes(rawType) ? rawType : 'assignment';

        const existingFiles = parseJsonArray(data.files);
        const allFiles = Array.from(new Set([...existingFiles, ...uploadedFilePaths]));

        const title = String(data.title || '').trim();
        if (!title) {
            const err = new Error('Assessment title is required.');
            err.statusCode = 400;
            throw err;
        }

        const dueDate = data.dueDate ? String(data.dueDate).replace('T', ' ').substring(0, 19) : null;
        if (!dueDate) {
            const err = new Error('Due date is required.');
            err.statusCode = 400;
            throw err;
        }

        const maxMarks = (data.maxMarks !== null && data.maxMarks !== undefined && data.maxMarks !== '')
            ? Number(data.maxMarks)
            : null;

        let initialStatus = 0; // Default draft when created unless explicitly published
        if (data.status !== undefined && data.status !== null) {
            const s = String(data.status).toLowerCase().trim();
            if (s === 'draft' || s === '0') initialStatus = 0;
            else if (s === 'published' || s === '1' || s === 'scheduled') initialStatus = 1;
            else if (s === 'closed' || s === '2' || s === 'completed') initialStatus = 2;
        } else if (data.statusCode !== undefined && data.statusCode !== null) {
            initialStatus = Number(data.statusCode);
        }

        // 1. Separate table routing: ASSIGNMENT
        if (assignmentType === 'assignment') {
            const statusStr = initialStatus === 1 ? 'published' : (initialStatus === 2 ? 'closed' : 'draft');
            const [insertResult] = await pool.query(
                `INSERT INTO assignments 
                 (tenant_id, branch_id, academic_year_id, batch_id, batch_ids, files, subject_id,
                  title, description, due_date, max_marks, status, created_by, updated_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    tid,
                    branchId,
                    academicYearId,
                    targetBatchIds[0] || null,
                    JSON.stringify(targetBatchIds),
                    JSON.stringify(allFiles),
                    subjectId,
                    title,
                    data.description ? String(data.description).trim() : '',
                    dueDate,
                    maxMarks,
                    statusStr,
                    uid,
                    uid
                ]
            );

            return this.getHomeworkById(tid, uid, `asg-${insertResult.insertId}`);
        }

        // 2. Separate table routing: EXAM
        if (assignmentType === 'exam') {
            let meta = {};
            try { meta = JSON.parse(data.description || '{}'); } catch {}
            const examType = meta.examType || 'Unit Test';
            const passingMarks = meta.passingMarks ?? 40;
            const examDate = dueDate.slice(0, 10);
            const statusStr = initialStatus === 1 ? 'scheduled' : (initialStatus === 2 ? 'completed' : 'draft');

            const [insertResult] = await pool.query(
                `INSERT INTO exams 
                 (tenant_id, branch_id, academic_year_id, subject_id, name, description, exam_type,
                  max_marks, passing_marks, exam_date, start_time, status, files, metadata, created_by, updated_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    tid,
                    branchId,
                    academicYearId,
                    subjectId,
                    title,
                    data.description ? String(data.description).trim() : '',
                    examType,
                    maxMarks || 100,
                    passingMarks,
                    examDate,
                    meta.startTime || null,
                    statusStr,
                    JSON.stringify(allFiles),
                    JSON.stringify(meta),
                    uid,
                    uid
                ]
            );

            const examId = insertResult.insertId;
            for (const bId of targetBatchIds) {
                await pool.query(
                    `INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)`,
                    [tid, examId, bId]
                );
            }

            return this.getHomeworkById(tid, uid, `exam-${examId}`);
        }

        // 3. Separate table routing: HOMEWORK
        const publishedAt = initialStatus === 1 ? new Date() : null;
        const [insertResult] = await pool.query(
            `INSERT INTO homeworks 
             (tenant_id, branch_id, academic_year_id, subject_id, title, description, assignment_type,
              batch_ids, files, due_date, max_marks, status, published_at, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'homework', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                tid,
                branchId,
                academicYearId,
                subjectId,
                title,
                data.description ? String(data.description).trim() : '',
                JSON.stringify(targetBatchIds),
                JSON.stringify(allFiles),
                dueDate,
                maxMarks,
                initialStatus,
                publishedAt,
                uid
            ]
        );

        return this.getHomeworkById(tid, uid, `hw-${insertResult.insertId}`);
    }

    /**
     * Update an assessment in its dedicated table.
     */
    async updateHomework(tenantId, teacherUserId, homeworkId, data, uploadedFilePaths = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);
        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        let targetBatchIds = homework.batch_ids ? parseJsonArray(homework.batch_ids).map(Number) : [];
        if (data.batchIds || data.batch_ids) {
            targetBatchIds = parseJsonArray(data.batchIds ?? data.batch_ids).map(Number).filter(Boolean);
        }

        let subjectId = homework.subject_id;
        if (data.subjectId || data.subject_id) {
            subjectId = Number(data.subjectId ?? data.subject_id);
        }

        // Validate targets
        await teacherAcademicScopeService.validateAssessmentTargets(tid, uid, targetBatchIds, subjectId);

        const title = data.title !== undefined ? String(data.title).trim() : (homework.title || homework.name);
        const description = data.description !== undefined ? String(data.description).trim() : homework.description;

        const existingFiles = data.files !== undefined ? parseJsonArray(data.files) : parseJsonArray(homework.files);
        const allFiles = Array.from(new Set([...existingFiles, ...uploadedFilePaths]));

        const dueDate = data.dueDate ? String(data.dueDate).replace('T', ' ').substring(0, 19) : homework.due_date;
        const maxMarks = data.maxMarks !== undefined ? (data.maxMarks === null || data.maxMarks === '' ? null : Number(data.maxMarks)) : homework.max_marks;

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
            await pool.query(
                `UPDATE assignments 
                 SET title = ?, description = ?, subject_id = ?, batch_id = ?, batch_ids = ?,
                     files = ?, due_date = ?, max_marks = ?, status = COALESCE(?, status), updated_by = ?, updated_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [
                    title,
                    description,
                    subjectId,
                    targetBatchIds[0] || null,
                    JSON.stringify(targetBatchIds),
                    JSON.stringify(allFiles),
                    dueDate,
                    maxMarks,
                    updateStatusStr,
                    uid,
                    numId,
                    tid
                ]
            );
        } else if (entityType === 'exam') {
            let meta = {};
            try { meta = JSON.parse(description || '{}'); } catch {}
            const examType = meta.examType || homework.exam_type || 'Unit Test';
            const passingMarks = meta.passingMarks ?? homework.passing_marks ?? 40;
            const examDate = dueDate ? String(dueDate).slice(0, 10) : homework.exam_date;

            await pool.query(
                `UPDATE exams 
                 SET name = ?, description = ?, subject_id = ?, exam_type = ?, max_marks = ?,
                     passing_marks = ?, exam_date = ?, files = ?, metadata = ?, status = COALESCE(?, status), updated_by = ?, updated_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [
                    title,
                    description,
                    subjectId,
                    examType,
                    maxMarks || 100,
                    passingMarks,
                    examDate,
                    JSON.stringify(allFiles),
                    JSON.stringify(meta),
                    updateStatusStr,
                    uid,
                    numId,
                    tid
                ]
            );

            await pool.query(`DELETE FROM exam_batch_assignments WHERE exam_id = ? AND tenant_id = ?`, [numId, tid]);
            for (const bId of targetBatchIds) {
                await pool.query(
                    `INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)`,
                    [tid, numId, bId]
                );
            }
        } else {
            await pool.query(
                `UPDATE homeworks 
                 SET title = ?, description = ?, subject_id = ?, batch_ids = ?,
                     files = ?, due_date = ?, max_marks = ?, status = COALESCE(?, status), updated_by = ?, updated_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [
                    title,
                    description,
                    subjectId,
                    JSON.stringify(targetBatchIds),
                    JSON.stringify(allFiles),
                    dueDate,
                    maxMarks,
                    updateHwStatusNum,
                    uid,
                    numId,
                    tid
                ]
            );
        }

        return this.getHomeworkById(tid, uid, homeworkId);
    }

    /**
     * Soft-delete an assessment in its dedicated table.
     */
    async deleteHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);
        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        if (entityType === 'assignment') {
            await pool.query(
                `UPDATE assignments SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else if (entityType === 'exam') {
            await pool.query(
                `UPDATE exams SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else {
            await pool.query(
                `UPDATE homeworks SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        }

        return { success: true, message: 'Assessment deleted successfully.' };
    }

    /**
     * Publish draft assessment in its dedicated table.
     */
    async publishHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);
        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        if (entityType === 'assignment') {
            await pool.query(
                `UPDATE assignments SET status = 'published', updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else if (entityType === 'exam') {
            await pool.query(
                `UPDATE exams SET status = 'scheduled', updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else {
            await pool.query(
                `UPDATE homeworks SET status = 1, published_at = NOW(), updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        }

        return this.getHomeworkById(tid, uid, homeworkId);
    }

    /**
     * Close assessment submissions in its dedicated table.
     */
    async closeHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);
        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        if (entityType === 'assignment') {
            await pool.query(
                `UPDATE assignments SET status = 'closed', updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else if (entityType === 'exam') {
            await pool.query(
                `UPDATE exams SET status = 'completed', updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        } else {
            await pool.query(
                `UPDATE homeworks SET status = 2, closed_at = NOW(), updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [uid, numId, tid]
            );
        }

        return this.getHomeworkById(tid, uid, homeworkId);
    }

    /**
     * Get the student evaluation roster for a homework/assignment/exam across separate submission tables.
     */
    async getEvaluationRoster(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework, homeworkBatchIds, allowedBatchIds } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        // Filter target batches to only those allocated to this teacher
        const activeBatchIds = homeworkBatchIds.filter(bid => allowedBatchIds.includes(bid));

        if (activeBatchIds.length === 0) {
            return {
                homework: { id: homeworkId, title: homework.title || homework.name, maxMarks: homework.max_marks },
                students: []
            };
        }

        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        let query = '';
        if (entityType === 'assignment') {
            query = `
                SELECT 
                    s.id AS student_id,
                    s.student_code,
                    s.full_name AS student_name,
                    b.id AS batch_id,
                    b.name AS batch_name,
                    asub.id AS submission_id,
                    asub.status AS submission_status,
                    asub.submitted_at,
                    asub.marks_obtained,
                    asub.teacher_feedback,
                    asub.files AS submission_files,
                    asub.response_text,
                    asub.graded_at,
                    asub.graded_by
                FROM student_enrollments se
                JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
                JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
                LEFT JOIN assignment_submissions asub 
                    ON asub.assignment_id = ? 
                   AND (asub.student_id = s.id OR asub.enrollment_id = se.id)
                   AND asub.deleted_at IS NULL
                WHERE se.tenant_id = ?
                  AND se.status = 'active'
                  AND se.deleted_at IS NULL
                  AND se.batch_id IN (?)
                ORDER BY b.name ASC, s.full_name ASC
            `;
        } else if (entityType === 'exam') {
            query = `
                SELECT 
                    s.id AS student_id,
                    s.student_code,
                    s.full_name AS student_name,
                    b.id AS batch_id,
                    b.name AS batch_name,
                    em.id AS submission_id,
                    em.status AS submission_status,
                    em.created_at AS submitted_at,
                    em.marks_obtained,
                    em.remarks AS teacher_feedback,
                    '[]' AS submission_files,
                    '' AS response_text,
                    em.updated_at AS graded_at,
                    em.updated_by AS graded_by
                FROM student_enrollments se
                JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
                JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
                LEFT JOIN exam_marks em 
                    ON em.exam_id = ? 
                   AND (em.student_id = s.id OR em.enrollment_id = se.id)
                   AND em.deleted_at IS NULL
                WHERE se.tenant_id = ?
                  AND se.status = 'active'
                  AND se.deleted_at IS NULL
                  AND se.batch_id IN (?)
                ORDER BY b.name ASC, s.full_name ASC
            `;
        } else {
            query = `
                SELECT 
                    s.id AS student_id,
                    s.student_code,
                    s.full_name AS student_name,
                    b.id AS batch_id,
                    b.name AS batch_name,
                    hs.id AS submission_id,
                    hs.status AS submission_status,
                    hs.submitted_at,
                    hs.marks_obtained,
                    hs.teacher_feedback,
                    hs.files AS submission_files,
                    hs.response_text,
                    hs.graded_at,
                    hs.graded_by
                FROM student_enrollments se
                JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
                JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
                LEFT JOIN homework_submissions hs 
                    ON hs.homework_id = ? 
                   AND hs.student_id = s.id 
                   AND hs.deleted_at IS NULL
                WHERE se.tenant_id = ?
                  AND se.status = 'active'
                  AND se.deleted_at IS NULL
                  AND se.batch_id IN (?)
                ORDER BY b.name ASC, s.full_name ASC
            `;
        }

        const [rows] = await pool.query(query, [numId, tid, activeBatchIds]);

        const students = rows.map(r => {
            const hasSubmission = Boolean(r.submission_id && r.submission_status);
            const isGraded = String(r.submission_status).toLowerCase() === 'graded' || (r.marks_obtained !== null && r.marks_obtained !== undefined);

            let status = 'Pending';
            if (isGraded) {
                status = 'Graded';
            } else if (hasSubmission) {
                status = 'Submitted';
            }

            return {
                studentId: r.student_id,
                studentCode: r.student_code,
                studentName: r.student_name,
                batchId: r.batch_id,
                batchName: r.batch_name,
                submissionId: r.submission_id || null,
                status,
                submittedAt: r.submitted_at || null,
                marksObtained: r.marks_obtained !== null && r.marks_obtained !== undefined ? Number(r.marks_obtained) : null,
                teacherFeedback: r.teacher_feedback || '',
                responseText: r.response_text || '',
                files: parseJsonArray(r.submission_files),
                gradedAt: r.graded_at || null
            };
        });

        return {
            homework: {
                id: String(homeworkId),
                title: homework.title || homework.name,
                assignmentType: homework.assignment_type || entityType,
                maxMarks: homework.max_marks !== null && homework.max_marks !== undefined ? Number(homework.max_marks) : null,
                dueDate: homework.due_date ? new Date(homework.due_date).toISOString().slice(0, 10) : '',
                status: formatStatus(homework.status)
            },
            students
        };
    }

    /**
     * Get list of submitted responses for an assessment.
     */
    async getSubmissions(tenantId, teacherUserId, homeworkId) {
        const roster = await this.getEvaluationRoster(tenantId, teacherUserId, homeworkId);
        return {
            homework: roster.homework,
            submissions: roster.students.filter(s => s.status === 'Submitted' || s.status === 'Graded')
        };
    }

    /**
     * Bulk grade multiple students for a homework/assignment/exam across separate submission tables.
     */
    async bulkGrade(tenantId, teacherUserId, homeworkId, grades = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework, homeworkBatchIds, allowedBatchIds } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        if (!Array.isArray(grades) || grades.length === 0) {
            const err = new Error('No grades submitted.');
            err.statusCode = 400;
            throw err;
        }

        const activeBatchIds = homeworkBatchIds.filter(bid => allowedBatchIds.includes(bid));

        // Fetch verified enrolled students in these batches
        const [enrolledStudents] = await pool.query(
            `SELECT se.id AS enrollment_id, se.student_id, se.batch_id 
             FROM student_enrollments se 
             WHERE se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL AND se.batch_id IN (?)`,
            [tid, activeBatchIds]
        );
        const enrollmentMap = new Map();
        enrolledStudents.forEach(e => enrollmentMap.set(Number(e.student_id), Number(e.enrollment_id)));

        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        for (const item of grades) {
            const studentId = Number(item.studentId || item.student_id);
            if (!studentId || !enrollmentMap.has(studentId)) {
                continue; // Skip invalid or unauthorized students
            }

            const rawEnr = enrollmentMap.get(studentId);
            const enrollmentId = (rawEnr && !isNaN(rawEnr)) ? Number(rawEnr) : null;
            const marks = item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== ''
                ? Number(item.marksObtained)
                : null;
            const feedback = item.teacherFeedback !== undefined ? String(item.teacherFeedback).trim() : null;

            if (entityType === 'assignment') {
                const [existing] = await pool.query(
                    `SELECT id FROM assignment_submissions 
                     WHERE tenant_id = ? AND assignment_id = ? AND (student_id = ? OR (? IS NOT NULL AND enrollment_id = ?)) AND deleted_at IS NULL LIMIT 1`,
                    [tid, numId, studentId, enrollmentId, enrollmentId]
                );

                if (existing.length > 0) {
                    await pool.query(
                        `UPDATE assignment_submissions 
                         SET marks_obtained = ?, teacher_feedback = COALESCE(?, teacher_feedback),
                             status = 'graded', graded_by = ?, graded_at = NOW(), updated_at = NOW()
                         WHERE id = ?`,
                        [marks, feedback, uid, existing[0].id]
                    );
                } else {
                    await pool.query(
                        `INSERT INTO assignment_submissions 
                         (tenant_id, assignment_id, enrollment_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at, created_at, updated_at)
                         VALUES (?, ?, ?, ?, 'graded', ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
                        [tid, numId, enrollmentId, studentId, marks, feedback || '', uid]
                    );
                }
            } else if (entityType === 'exam') {
                const [existing] = await pool.query(
                    `SELECT id FROM exam_marks 
                     WHERE tenant_id = ? AND exam_id = ? AND (student_id = ? OR (? IS NOT NULL AND enrollment_id = ?)) AND deleted_at IS NULL LIMIT 1`,
                    [tid, numId, studentId, enrollmentId, enrollmentId]
                );

                if (existing.length > 0) {
                    await pool.query(
                        `UPDATE exam_marks 
                         SET marks_obtained = ?, remarks = COALESCE(?, remarks),
                             status = 'graded', updated_by = ?, updated_at = NOW()
                         WHERE id = ?`,
                        [marks, feedback, uid, existing[0].id]
                    );
                } else {
                    await pool.query(
                        `INSERT INTO exam_marks 
                         (tenant_id, exam_id, enrollment_id, student_id, marks_obtained, is_absent, remarks, is_result_visible, status, created_by, updated_by, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 0, ?, 1, 'graded', ?, ?, NOW(), NOW())`,
                        [tid, numId, enrollmentId, studentId, marks, feedback || '', uid, uid]
                    );
                }
            } else {
                const [existing] = await pool.query(
                    `SELECT id FROM homework_submissions 
                     WHERE tenant_id = ? AND homework_id = ? AND student_id = ? AND deleted_at IS NULL LIMIT 1`,
                    [tid, numId, studentId]
                );

                if (existing.length > 0) {
                    await pool.query(
                        `UPDATE homework_submissions 
                         SET marks_obtained = ?, teacher_feedback = COALESCE(?, teacher_feedback),
                             status = 'Graded', graded_by = ?, graded_at = NOW(), updated_at = NOW()
                         WHERE id = ?`,
                        [marks, feedback, uid, existing[0].id]
                    );
                } else {
                    await pool.query(
                        `INSERT INTO homework_submissions 
                         (tenant_id, homework_id, student_id, response_text, files, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at, created_at, updated_at)
                         VALUES (?, ?, ?, '', '[]', 'Graded', ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
                        [tid, numId, studentId, marks, feedback || '', uid]
                    );
                }
            }
        }

        return this.getEvaluationRoster(tid, uid, homeworkId);
    }

    /**
     * Grade a single submission across dedicated submission tables.
     */
    async gradeSubmission(tenantId, teacherUserId, homeworkId, submissionId, data) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);
        const entityType = homework._entityType || 'homework';
        const numId = homework.id;

        const marks = data.marksObtained !== null && data.marksObtained !== undefined && data.marksObtained !== ''
            ? Number(data.marksObtained)
            : null;
        const feedback = data.teacherFeedback !== undefined ? String(data.teacherFeedback).trim() : null;

        if (entityType === 'assignment') {
            let [subRows] = await pool.query(
                `SELECT * FROM assignment_submissions WHERE id = ? AND assignment_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [Number(submissionId), numId, tid]
            );

            if (!subRows.length) {
                const studentId = Number(data.studentId || data.student_id || submissionId);
                if (studentId) {
                    const [existing] = await pool.query(
                        `SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                        [numId, studentId, tid]
                    );
                    if (existing.length) {
                        subRows = existing;
                    } else {
                        const [enrRows] = await pool.query(
                            `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                            [tid, studentId]
                        );
                        const enrollmentId = enrRows.length ? enrRows[0].id : null;
                        const [ins] = await pool.query(
                            `INSERT INTO assignment_submissions 
                             (tenant_id, assignment_id, enrollment_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at, created_at, updated_at)
                             VALUES (?, ?, ?, ?, 'graded', ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
                            [tid, numId, enrollmentId, studentId, marks, feedback || '', uid]
                        );
                        return {
                            submissionId: ins.insertId,
                            status: 'Graded',
                            marksObtained: marks,
                            teacherFeedback: feedback || '',
                            gradedAt: new Date()
                        };
                    }
                }
            }

            if (!subRows.length) {
                const err = new Error('Submission not found.');
                err.statusCode = 404;
                throw err;
            }

            const fb = feedback !== null ? feedback : subRows[0].teacher_feedback;
            await pool.query(
                `UPDATE assignment_submissions 
                 SET marks_obtained = ?, teacher_feedback = ?, status = 'graded',
                     graded_by = ?, graded_at = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [marks, fb, uid, subRows[0].id]
            );

            return {
                submissionId: subRows[0].id,
                status: 'Graded',
                marksObtained: marks,
                teacherFeedback: fb,
                gradedAt: new Date()
            };
        } else if (entityType === 'exam') {
            let [markRows] = await pool.query(
                `SELECT * FROM exam_marks WHERE id = ? AND exam_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [Number(submissionId), numId, tid]
            );

            if (!markRows.length) {
                const studentId = Number(data.studentId || data.student_id || submissionId);
                if (studentId) {
                    const [existing] = await pool.query(
                        `SELECT * FROM exam_marks WHERE exam_id = ? AND student_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                        [numId, studentId, tid]
                    );
                    if (existing.length) {
                        markRows = existing;
                    } else {
                        const [enrRows] = await pool.query(
                            `SELECT id FROM student_enrollments WHERE tenant_id = ? AND student_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
                            [tid, studentId]
                        );
                        const enrollmentId = enrRows.length ? enrRows[0].id : null;
                        const [ins] = await pool.query(
                            `INSERT INTO exam_marks 
                             (tenant_id, exam_id, enrollment_id, student_id, marks_obtained, is_absent, remarks, is_result_visible, status, created_by, updated_by, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, 0, ?, 1, 'graded', ?, ?, NOW(), NOW())`,
                            [tid, numId, enrollmentId, studentId, marks, feedback || '', uid, uid]
                        );
                        return {
                            submissionId: ins.insertId,
                            status: 'Graded',
                            marksObtained: marks,
                            teacherFeedback: feedback || '',
                            gradedAt: new Date()
                        };
                    }
                }
            }

            if (!markRows.length) {
                const err = new Error('Exam mark record not found.');
                err.statusCode = 404;
                throw err;
            }

            const fb = feedback !== null ? feedback : markRows[0].remarks;
            await pool.query(
                `UPDATE exam_marks 
                 SET marks_obtained = ?, remarks = ?, status = 'graded',
                     updated_by = ?, updated_at = NOW()
                 WHERE id = ?`,
                [marks, fb, uid, markRows[0].id]
            );

            return {
                submissionId: markRows[0].id,
                status: 'Graded',
                marksObtained: marks,
                teacherFeedback: fb,
                gradedAt: new Date()
            };
        } else {
            let [subRows] = await pool.query(
                `SELECT * FROM homework_submissions WHERE id = ? AND homework_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [Number(submissionId), numId, tid]
            );

            if (!subRows.length) {
                const studentId = Number(data.studentId || data.student_id || submissionId);
                if (studentId) {
                    const [existing] = await pool.query(
                        `SELECT * FROM homework_submissions WHERE homework_id = ? AND student_id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                        [numId, studentId, tid]
                    );
                    if (existing.length) {
                        subRows = existing;
                    } else {
                        const [ins] = await pool.query(
                            `INSERT INTO homework_submissions 
                             (tenant_id, homework_id, student_id, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at, created_at, updated_at)
                             VALUES (?, ?, ?, 'Graded', ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
                            [tid, numId, studentId, marks, feedback || '', uid]
                        );
                        return {
                            submissionId: ins.insertId,
                            status: 'Graded',
                            marksObtained: marks,
                            teacherFeedback: feedback || '',
                            gradedAt: new Date()
                        };
                    }
                }
            }

            if (!subRows.length) {
                const err = new Error('Submission not found.');
                err.statusCode = 404;
                throw err;
            }

            const fb = feedback !== null ? feedback : subRows[0].teacher_feedback;
            await pool.query(
                `UPDATE homework_submissions 
                 SET marks_obtained = ?, teacher_feedback = ?, status = 'Graded',
                     graded_by = ?, graded_at = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [marks, fb, uid, subRows[0].id]
            );

            return {
                submissionId: subRows[0].id,
                status: 'Graded',
                marksObtained: marks,
                teacherFeedback: fb,
                gradedAt: new Date()
            };
        }
    }
}

module.exports = new TeacherHomeworkService();
