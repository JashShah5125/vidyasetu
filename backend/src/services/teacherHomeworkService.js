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
            // Fallback: all active tenant subjects if none explicitly restricted
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
     * List homeworks/assignments/exams scoped to teacher allocations.
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
        const limit = Math.max(1, Math.min(100, parseInt(params.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const whereClauses = [
            'h.tenant_id = ?',
            'h.deleted_at IS NULL'
        ];
        const queryParams = [tid];

        // Teacher dual-factor scope:
        // 1. Target batch intersection: assessment must target at least one of teacher's assigned batches
        const batchOrConditions = allowedBatchIds.map(() => `JSON_CONTAINS(h.batch_ids, CAST(? AS JSON))`).join(' OR ');
        whereClauses.push(`(${batchOrConditions})`);
        queryParams.push(...allowedBatchIds);

        // 2. Subject scoping: assessment must belong to teacher's assigned subjects
        whereClauses.push(`h.subject_id IN (?)`);
        queryParams.push(allowedSubjectIds);

        // Optional filter: specific batchId
        if (params.batchId && params.batchId !== 'All' && params.batchId !== '') {
            const requestedBatchId = Number(params.batchId);
            if (allowedBatchIds.includes(requestedBatchId)) {
                whereClauses.push(`JSON_CONTAINS(h.batch_ids, CAST(? AS JSON))`);
                queryParams.push(requestedBatchId);
            } else {
                // If requested batch is not assigned, return empty
                return {
                    data: [],
                    pagination: { total: 0, page, limit, totalPages: 1 }
                };
            }
        }

        // Optional filter: specific subjectId
        if (params.subjectId && params.subjectId !== 'All' && params.subjectId !== '') {
            const requestedSubjectId = Number(params.subjectId);
            if (allowedSubjectIds.includes(requestedSubjectId)) {
                whereClauses.push('h.subject_id = ?');
                queryParams.push(requestedSubjectId);
            } else {
                // If requested subject is not assigned, return empty
                return {
                    data: [],
                    pagination: { total: 0, page, limit, totalPages: 1 }
                };
            }
        }

        // Optional filter: assignmentType
        if (params.assignmentType && params.assignmentType !== 'All' && params.assignmentType !== '') {
            whereClauses.push('h.assignment_type = ?');
            queryParams.push(String(params.assignmentType).toLowerCase().trim());
        }

        // Optional filter: status
        if (params.status !== undefined && params.status !== 'All' && params.status !== '') {
            const s = String(params.status).toLowerCase().trim();
            if (s === 'draft' || s === '0') {
                whereClauses.push('h.status = 0');
            } else if (s === 'published' || s === '1') {
                whereClauses.push('h.status = 1');
            } else if (s === 'closed' || s === '2') {
                whereClauses.push('h.status = 2');
            }
        }

        // Optional filter: academicYearId
        if (params.academicYearId && params.academicYearId !== 'All' && params.academicYearId !== '') {
            whereClauses.push('h.academic_year_id = ?');
            queryParams.push(Number(params.academicYearId));
        }

        // Optional search: title or description
        if (params.search && params.search.trim() !== '') {
            whereClauses.push('(h.title LIKE ? OR h.description LIKE ?)');
            const term = `%${params.search.trim()}%`;
            queryParams.push(term, term);
        }

        const whereSql = whereClauses.join(' AND ');

        // Count query
        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS total FROM homeworks h WHERE ${whereSql}`,
            queryParams
        );
        const total = Number(countResult[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        // Data query
        const [rows] = await pool.query(
            `SELECT h.*,
                    s.name AS subject_name,
                    s.code AS subject_code,
                    ay.name AS academic_year_name,
                    br.name AS branch_name,
                    (SELECT COUNT(*) 
                     FROM homework_submissions hs 
                     WHERE hs.homework_id = h.id AND hs.deleted_at IS NULL) AS submitted_count,
                    (SELECT COUNT(*) 
                     FROM homework_submissions hs 
                     WHERE hs.homework_id = h.id 
                       AND (hs.status = 'graded' OR hs.status = 'Graded' OR hs.marks_obtained IS NOT NULL) 
                       AND hs.deleted_at IS NULL) AS graded_submissions_count,
                    (SELECT AVG((hs.marks_obtained / NULLIF(h.max_marks, 0)) * 100) 
                     FROM homework_submissions hs 
                     WHERE hs.homework_id = h.id 
                       AND hs.marks_obtained IS NOT NULL 
                       AND hs.deleted_at IS NULL) AS class_average_percentage,
                    (SELECT COUNT(DISTINCT se.student_id) 
                     FROM student_enrollments se 
                     WHERE se.tenant_id = h.tenant_id 
                       AND se.status = 'active' 
                       AND se.deleted_at IS NULL 
                       AND JSON_CONTAINS(h.batch_ids, CAST(se.batch_id AS JSON))) AS total_students
             FROM homeworks h
             LEFT JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
             LEFT JOIN academic_years ay ON ay.id = h.academic_year_id AND ay.deleted_at IS NULL
             LEFT JOIN branches br ON br.id = h.branch_id AND br.deleted_at IS NULL
             WHERE ${whereSql}
             ORDER BY h.due_date DESC, h.id DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        // Fetch batch names for all rows
        const allTargetBatchIds = Array.from(new Set(
            rows.flatMap(r => parseJsonArray(r.batch_ids).map(Number)).filter(Boolean)
        ));

        let batchMap = new Map();
        if (allTargetBatchIds.length > 0) {
            const [batchRows] = await pool.query(
                `SELECT id, name, code FROM batches WHERE tenant_id = ? AND id IN (?)`,
                [tid, allTargetBatchIds]
            );
            batchRows.forEach(b => batchMap.set(b.id, b.name));
        }

        const data = rows.map(r => {
            const bIds = parseJsonArray(r.batch_ids).map(Number).filter(Boolean);
            const batchNames = bIds.map(id => batchMap.get(id) || `Batch ${id}`);
            const files = parseJsonArray(r.files);

            return {
                id: String(r.id),
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
                dueDate: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : '',
                dueDateTime: r.due_date ? String(r.due_date).replace(' ', 'T') : '',
                maxMarks: r.max_marks !== null && r.max_marks !== undefined ? Number(r.max_marks) : null,
                status: formatStatus(r.status),
                statusCode: Number(r.status ?? 0),
                publishedAt: r.published_at || null,
                closedAt: r.closed_at || null,
                submittedCount: Number(r.submitted_count || 0),
                gradedSubmissionsCount: Number(r.graded_submissions_count || 0),
                classAveragePercentage: r.class_average_percentage !== null && r.class_average_percentage !== undefined 
                    ? Number(Number(r.class_average_percentage).toFixed(1)) 
                    : null,
                totalCount: Number(r.total_students || 0),
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
     * Get single assessment details by ID.
     */
    async getHomeworkById(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework, homeworkBatchIds } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        // Fetch batch details
        let batchNames = [];
        if (homeworkBatchIds.length > 0) {
            const [batchRows] = await pool.query(
                `SELECT id, name, code FROM batches WHERE tenant_id = ? AND id IN (?)`,
                [tid, homeworkBatchIds]
            );
            batchNames = batchRows.map(b => b.name);
        }

        // Counts
        const [counts] = await pool.query(
            `SELECT 
                (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = ? AND hs.deleted_at IS NULL) AS submitted_count,
                (SELECT COUNT(DISTINCT se.student_id) 
                 FROM student_enrollments se 
                 WHERE se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL 
                   AND JSON_CONTAINS(?, CAST(se.batch_id AS JSON))) AS total_students`,
            [homework.id, tid, JSON.stringify(homeworkBatchIds)]
        );

        return {
            id: String(homework.id),
            title: homework.title,
            description: homework.description || '',
            assignmentType: homework.assignment_type || 'assignment',
            subjectId: homework.subject_id,
            subjectName: homework.subject_name || '',
            subjectCode: homework.subject_code || '',
            branchId: homework.branch_id,
            academicYearId: homework.academic_year_id,
            batchIds: homeworkBatchIds,
            batchNames,
            files: parseJsonArray(homework.files),
            dueDate: homework.due_date ? new Date(homework.due_date).toISOString().slice(0, 10) : '',
            dueDateTime: homework.due_date ? String(homework.due_date).replace(' ', 'T') : '',
            maxMarks: homework.max_marks !== null && homework.max_marks !== undefined ? Number(homework.max_marks) : null,
            status: formatStatus(homework.status),
            statusCode: Number(homework.status ?? 0),
            publishedAt: homework.published_at || null,
            closedAt: homework.closed_at || null,
            submittedCount: Number(counts[0]?.submitted_count || 0),
            totalCount: Number(counts[0]?.total_students || 0),
            createdAt: homework.created_at,
            updatedAt: homework.updated_at
        };
    }

    /**
     * Create a new homework/assignment/exam.
     */
    async createHomework(tenantId, teacherUserId, data, uploadedFilePaths = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const targetBatchIds = parseJsonArray(data.batchIds ?? data.batch_ids).map(Number).filter(Boolean);
        const subjectId = Number(data.subjectId ?? data.subject_id);

        // Authorize target batches and subject
        await teacherAcademicScopeService.validateAssessmentTargets(tid, uid, targetBatchIds, subjectId);

        // Resolve branch_id from target batches
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

        const maxMarks = data.maxMarks !== null && data.maxMarks !== undefined && data.maxMarks !== '' ? Number(data.maxMarks) : null;
        const initialStatus = Number(data.status ?? data.statusCode ?? 1); // Default to Published (1) or Draft (0)
        const publishedAt = initialStatus === 1 ? new Date() : null;

        const [insertResult] = await pool.query(
            `INSERT INTO homeworks 
             (tenant_id, branch_id, academic_year_id, subject_id, title, description, assignment_type,
              batch_ids, files, due_date, max_marks, status, published_at, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                tid,
                branchId,
                academicYearId,
                subjectId,
                title,
                data.description ? String(data.description).trim() : '',
                assignmentType,
                JSON.stringify(targetBatchIds),
                JSON.stringify(allFiles),
                dueDate,
                maxMarks,
                initialStatus,
                publishedAt,
                uid
            ]
        );

        return this.getHomeworkById(tid, uid, insertResult.insertId);
    }

    /**
     * Update an assessment.
     */
    async updateHomework(tenantId, teacherUserId, homeworkId, data, uploadedFilePaths = []) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

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

        const title = data.title !== undefined ? String(data.title).trim() : homework.title;
        const description = data.description !== undefined ? String(data.description).trim() : homework.description;
        const rawType = String(data.assignmentType ?? data.assignment_type ?? homework.assignment_type).toLowerCase().trim();
        const assignmentType = ['assignment', 'homework', 'exam'].includes(rawType) ? rawType : 'assignment';

        const existingFiles = data.files !== undefined ? parseJsonArray(data.files) : parseJsonArray(homework.files);
        const allFiles = Array.from(new Set([...existingFiles, ...uploadedFilePaths]));

        const dueDate = data.dueDate ? String(data.dueDate).replace('T', ' ').substring(0, 19) : homework.due_date;
        const maxMarks = data.maxMarks !== undefined ? (data.maxMarks === null || data.maxMarks === '' ? null : Number(data.maxMarks)) : homework.max_marks;

        await pool.query(
            `UPDATE homeworks 
             SET title = ?, description = ?, assignment_type = ?, subject_id = ?, batch_ids = ?,
                 files = ?, due_date = ?, max_marks = ?, updated_by = ?, updated_at = NOW()
             WHERE id = ? AND tenant_id = ?`,
            [
                title,
                description,
                assignmentType,
                subjectId,
                JSON.stringify(targetBatchIds),
                JSON.stringify(allFiles),
                dueDate,
                maxMarks,
                uid,
                homework.id,
                tid
            ]
        );

        return this.getHomeworkById(tid, uid, homework.id);
    }

    /**
     * Soft-delete an assessment.
     */
    async deleteHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        await pool.query(
            `UPDATE homeworks 
             SET deleted_at = NOW(), updated_by = ? 
             WHERE id = ? AND tenant_id = ?`,
            [uid, homework.id, tid]
        );

        return { success: true, message: 'Assessment deleted successfully.' };
    }

    /**
     * Publish draft assessment.
     */
    async publishHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        await pool.query(
            `UPDATE homeworks 
             SET status = 1, published_at = NOW(), updated_by = ?, updated_at = NOW() 
             WHERE id = ? AND tenant_id = ?`,
            [uid, homework.id, tid]
        );

        return this.getHomeworkById(tid, uid, homework.id);
    }

    /**
     * Close assessment submissions.
     */
    async closeHomework(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        await pool.query(
            `UPDATE homeworks 
             SET status = 2, closed_at = NOW(), updated_by = ?, updated_at = NOW() 
             WHERE id = ? AND tenant_id = ?`,
            [uid, homework.id, tid]
        );

        return this.getHomeworkById(tid, uid, homework.id);
    }

    /**
     * Get the student evaluation roster for a homework.
     * Returns all enrolled students in the target batches + their submission state and marks.
     */
    async getEvaluationRoster(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework, homeworkBatchIds, allowedBatchIds } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        // Filter target batches to only those allocated to this teacher
        const activeBatchIds = homeworkBatchIds.filter(bid => allowedBatchIds.includes(bid));

        if (activeBatchIds.length === 0) {
            return {
                homework: { id: homework.id, title: homework.title, maxMarks: homework.max_marks },
                students: []
            };
        }

        const [rows] = await pool.query(
            `SELECT 
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
             ORDER BY b.name ASC, s.full_name ASC`,
            [homework.id, tid, activeBatchIds]
        );

        const students = rows.map(r => {
            const hasSubmission = Boolean(r.submission_id && r.submission_status);
            const isGraded = r.submission_status === 'Graded' || (r.marks_obtained !== null && r.marks_obtained !== undefined);

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
                id: String(homework.id),
                title: homework.title,
                assignmentType: homework.assignment_type || 'assignment',
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
     * Bulk grade multiple students for a homework.
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
            `SELECT se.student_id 
             FROM student_enrollments se 
             WHERE se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL AND se.batch_id IN (?)`,
            [tid, activeBatchIds]
        );
        const allowedStudentIds = new Set(enrolledStudents.map(s => Number(s.student_id)));

        for (const item of grades) {
            const studentId = Number(item.studentId || item.student_id);
            if (!studentId || !allowedStudentIds.has(studentId)) {
                continue; // Skip invalid or unauthorized students
            }

            const marks = item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== ''
                ? Number(item.marksObtained)
                : null;
            const feedback = item.teacherFeedback !== undefined ? String(item.teacherFeedback).trim() : null;

            // Check if submission already exists
            const [existing] = await pool.query(
                `SELECT id FROM homework_submissions 
                 WHERE tenant_id = ? AND homework_id = ? AND student_id = ? AND deleted_at IS NULL LIMIT 1`,
                [tid, homework.id, studentId]
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
                // Create submission as graded by teacher
                await pool.query(
                    `INSERT INTO homework_submissions 
                     (tenant_id, homework_id, student_id, response_text, files, status, marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at, created_at, updated_at)
                     VALUES (?, ?, ?, '', '[]', 'Graded', ?, ?, NOW(), ?, NOW(), NOW(), NOW())`,
                    [tid, homework.id, studentId, marks, feedback || '', uid]
                );
            }
        }

        return this.getEvaluationRoster(tid, uid, homework.id);
    }

    /**
     * Grade a single submission.
     */
    async gradeSubmission(tenantId, teacherUserId, homeworkId, submissionId, data) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const { homework } = await teacherAcademicScopeService.validateHomeworkAccess(tid, uid, homeworkId);

        const [subRows] = await pool.query(
            `SELECT * FROM homework_submissions WHERE id = ? AND homework_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [Number(submissionId), homework.id, tid]
        );

        if (!subRows.length) {
            const err = new Error('Submission not found.');
            err.statusCode = 404;
            throw err;
        }

        const marks = data.marksObtained !== null && data.marksObtained !== undefined && data.marksObtained !== ''
            ? Number(data.marksObtained)
            : null;
        const feedback = data.teacherFeedback !== undefined ? String(data.teacherFeedback).trim() : subRows[0].teacher_feedback;

        await pool.query(
            `UPDATE homework_submissions 
             SET marks_obtained = ?, teacher_feedback = ?, status = 'Graded',
                 graded_by = ?, graded_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [marks, feedback, uid, subRows[0].id]
        );

        return {
            submissionId: subRows[0].id,
            status: 'Graded',
            marksObtained: marks,
            teacherFeedback: feedback,
            gradedAt: new Date()
        };
    }
}

module.exports = new TeacherHomeworkService();
