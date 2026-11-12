const db = require('../config/db');

/**
 * Safely parse JSON metadata column from MySQL.
 */
function parseMetadata(raw) {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Format duration label from metadata or start/end times.
 */
function resolveDuration(startTime, endTime, metadata) {
    if (metadata?.duration) return String(metadata.duration);
    if (startTime && endTime) {
        const [sh, sm] = String(startTime).split(':').map(Number);
        const [eh, em] = String(endTime).split(':').map(Number);
        if (!Number.isNaN(sh) && !Number.isNaN(sm) && !Number.isNaN(eh) && !Number.isNaN(em)) {
            const diffMins = (eh * 60 + em) - (sh * 60 + sm);
            if (diffMins > 0) return `${diffMins} mins`;
        }
    }
    return '90 mins';
}

/**
 * Compute HH:MM:SS end time from start time and duration string (e.g. "90 mins" or "1.5 hrs").
 */
function computeEndTime(startTime, durationVal, explicitEndTime) {
    if (explicitEndTime) return explicitEndTime;
    if (!startTime) return null;

    const matchMin = String(durationVal || '').match(/(\d+(?:\.\d+)?)\s*(?:hr|hour|h)/i);
    let mins = 90;
    if (matchMin) {
        mins = Math.round(Number(matchMin[1]) * 60);
    } else {
        const numMatch = String(durationVal || '').match(/(\d+)/);
        if (numMatch) mins = Number(numMatch[1]);
    }
    if (!Number.isFinite(mins) || mins <= 0) mins = 90;

    const parts = String(startTime).split(':').map(Number);
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
    const totalMins = (parts[0] * 60 + parts[1] + mins) % (24 * 60);
    const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
    const mm = String(totalMins % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
}

/**
 * Normalize status values stored in DB (legacy lowercase or UI labels) for ExamMarks UI.
 */
function normalizeExamStatus(rawStatus, gradedCount = 0, visibleCount = 0) {
    const raw = String(rawStatus || '').trim();
    const lower = raw.toLowerCase();

    if (lower === 'marks published' || lower === 'published') return 'Marks Published';
    if (lower === 'marks pending' || lower === 'pending') return 'Marks Pending';
    if (lower === 'in progress') return 'In Progress';
    if (lower === 'scheduled') return 'Scheduled';
    if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
    if (lower === 'completed') {
        if (Number(visibleCount) > 0) return 'Marks Published';
        return Number(gradedCount) > 0 ? 'Marks Pending' : 'Marks Published';
    }
    return raw || 'Scheduled';
}

/**
 * Format DB exam row into a clean response object compatible with both camelCase and snake_case consumers.
 */
function formatExamRow(row) {
    const metadata = parseMetadata(row.metadata);
    const totalMarks = Number(row.max_marks ?? row.total_marks ?? 100);
    const passingMarks = row.passing_marks !== null && row.passing_marks !== undefined
        ? Number(row.passing_marks)
        : Math.round(totalMarks * 0.4);
    const gradedCount = Number(row.marks_entered_count || 0);
    const visibleCount = Number(row.visible_marks_count || 0);
    const computedAvg = row.avg_marks !== null && row.avg_marks !== undefined
        ? Number(Number(row.avg_marks).toFixed(2))
        : (metadata.class_average !== undefined ? Number(metadata.class_average) : null);

    const examDate = row.exam_date instanceof Date
        ? row.exam_date.toISOString().slice(0, 10)
        : (row.exam_date ? String(row.exam_date).slice(0, 10) : null);

    const instructions = row.description || metadata.instructions || '';
    const duration = resolveDuration(row.start_time, row.end_time, metadata);
    const status = normalizeExamStatus(row.status, gradedCount, visibleCount);

    return {
        id: row.id,
        tenant_id: row.tenant_id,
        branch_id: row.branch_id,
        branch_name: row.branch_name || null,
        branch: row.branch_name || null,
        academic_year_id: row.academic_year_id,
        course_id: row.course_id || null,
        course_name: row.course_name || null,
        course: row.course_name || null,
        batch_id: row.batch_id || null,
        batch_name: row.batch_name || null,
        batch: row.batch_name || null,
        batch_ids: row.batch_ids
            ? String(row.batch_ids).split(',').map(Number).filter(Boolean)
            : (row.batch_id ? [Number(row.batch_id)] : []),
        subject_id: row.subject_id,
        subject: row.subject_name || metadata.subject || 'General',
        subject_name: row.subject_name || metadata.subject || 'General',
        title: row.name,
        name: row.name,
        exam_type: row.exam_type,
        type: row.exam_type,
        exam_date: examDate,
        examDate,
        start_time: row.start_time ? String(row.start_time).slice(0, 5) : null,
        startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
        end_time: row.end_time ? String(row.end_time).slice(0, 5) : null,
        duration,
        total_marks: totalMarks,
        max_marks: totalMarks,
        totalMarks,
        passing_marks: passingMarks,
        passingMarks,
        class_average: computedAvg,
        average: computedAvg,
        instructions,
        description: row.description || '',
        status,
        marks_entered_count: gradedCount,
        total_students_count: Number(row.total_students_count || 0),
        metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Helper to resolve branch_id, academic_year_id, batch_id(s), and subject_id for createExam/updateExam.
 */
async function resolveExamReferences(conn, tenantId, data, userId) {
    const rawBatchId = data.batchId || data.batch_id || null;
    const rawBatchName = data.batchName || data.batch_name || data.batch || null;
    let resolvedBatchId = null;
    let batchRecord = null;

    if (rawBatchId && !Number.isNaN(Number(rawBatchId))) {
        const [rows] = await conn.query(
            `SELECT id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1`,
            [tenantId, Number(rawBatchId)]
        );
        if (rows.length) {
            batchRecord = rows[0];
            resolvedBatchId = rows[0].id;
        }
    }

    if (!batchRecord && rawBatchName) {
        const [rows] = await conn.query(
            `SELECT id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1`,
            [tenantId, String(rawBatchName)]
        );
        if (rows.length) {
            batchRecord = rows[0];
            resolvedBatchId = rows[0].id;
        }
    }

    // Resolve branch_id (NOT NULL on exams)
    let resolvedBranchId = data.branchId || data.branch_id || null;
    if (resolvedBranchId && !Number.isNaN(Number(resolvedBranchId))) {
        resolvedBranchId = Number(resolvedBranchId);
    } else {
        resolvedBranchId = null;
    }

    if (!resolvedBranchId && (data.branchName || data.branch_name || data.branch) && String(data.branchName || data.branch_name || data.branch) !== 'All') {
        const branchLabel = String(data.branchName || data.branch_name || data.branch);
        const [bRows] = await conn.query(
            `SELECT id FROM branches WHERE tenant_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1`,
            [tenantId, branchLabel]
        );
        if (bRows.length) resolvedBranchId = bRows[0].id;
    }

    if (!resolvedBranchId && batchRecord?.branch_id) {
        resolvedBranchId = batchRecord.branch_id;
    }

    if (!resolvedBranchId) {
        const [bRows] = await conn.query(
            `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY status = 'active' DESC, id ASC LIMIT 1`,
            [tenantId]
        );
        if (bRows.length) resolvedBranchId = bRows[0].id;
    }

    if (!resolvedBranchId) {
        const err = new Error('No active branch found for this institute');
        err.statusCode = 400;
        throw err;
    }

    // Resolve academic_year_id (NOT NULL on exams)
    let resolvedAcademicYearId = data.academicYearId || data.academic_year_id || null;
    if (resolvedAcademicYearId && !Number.isNaN(Number(resolvedAcademicYearId))) {
        resolvedAcademicYearId = Number(resolvedAcademicYearId);
    } else {
        resolvedAcademicYearId = null;
    }

    if (!resolvedAcademicYearId && batchRecord?.academic_year_id) {
        resolvedAcademicYearId = batchRecord.academic_year_id;
    }

    if (!resolvedAcademicYearId) {
        const [ayRows] = await conn.query(
            `SELECT id FROM academic_years
             WHERE tenant_id = ? AND deleted_at IS NULL
             ORDER BY (branch_id = ?) DESC, (status = 'active') DESC, start_date DESC, id DESC
             LIMIT 1`,
            [tenantId, resolvedBranchId]
        );
        if (ayRows.length) resolvedAcademicYearId = ayRows[0].id;
    }

    if (!resolvedAcademicYearId) {
        const err = new Error('No academic year configured for this branch');
        err.statusCode = 400;
        throw err;
    }

    // Resolve subject_id (NOT NULL on exams)
    let resolvedSubjectId = data.subjectId || data.subject_id || null;
    if (resolvedSubjectId && !Number.isNaN(Number(resolvedSubjectId))) {
        resolvedSubjectId = Number(resolvedSubjectId);
    } else {
        resolvedSubjectId = null;
    }

    const rawSubjectName = String(data.subject || data.subjectName || data.subject_name || '').trim();
    if (!resolvedSubjectId && rawSubjectName) {
        const [sRows] = await conn.query(
            `SELECT id FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
            [tenantId, rawSubjectName]
        );
        if (sRows.length) {
            resolvedSubjectId = sRows[0].id;
        } else {
            const [insSub] = await conn.query(
                `INSERT INTO subjects (tenant_id, name, type, status, created_by, updated_by)
                 VALUES (?, ?, 'academic', 'active', ?, ?)`,
                [tenantId, rawSubjectName, userId || null, userId || null]
            );
            resolvedSubjectId = insSub.insertId;
        }
    }

    if (!resolvedSubjectId) {
        const [sRows] = await conn.query(
            `SELECT id FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY status = 'active' DESC, id ASC LIMIT 1`,
            [tenantId]
        );
        if (sRows.length) {
            resolvedSubjectId = sRows[0].id;
        } else {
            const [insSub] = await conn.query(
                `INSERT INTO subjects (tenant_id, name, type, status, created_by, updated_by)
                 VALUES (?, 'General', 'academic', 'active', ?, ?)`,
                [tenantId, userId || null, userId || null]
            );
            resolvedSubjectId = insSub.insertId;
        }
    }

    return {
        resolvedBatchId,
        resolvedBranchId,
        resolvedAcademicYearId,
        resolvedSubjectId,
    };
}

const examModel = {
    /**
     * Schema is managed by migrations_v2 / src/migrations; keep helper safe if invoked.
     */
    async ensureTablesExist() {
        return true;
    },

    /**
     * Calculate grade from percentage.
     */
    calculateGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    },

    /**
     * Get all exams for a tenant with optional filters and role scope.
     */
    async getExams(tenantId, filters = {}, accessContext = null) {
        const {
            branchId,
            branchName,
            batchId,
            batch,
            subject,
            subjectId,
            courseId,
            course,
            examType,
            type,
            status,
            search,
            academicYearId,
        } = filters;

        const joinsParams = [tenantId, tenantId];
        let whereClause = 'WHERE e.tenant_id = ? AND e.deleted_at IS NULL';
        const whereParams = [tenantId];

        if (accessContext) {
            if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
                whereClause += ' AND e.branch_id = ?';
                whereParams.push(accessContext.authorizedBranchId);
            } else if (accessContext.scope === 'TEACHER') {
                const assignedBatchIds = Array.isArray(accessContext.assignedBatchIds)
                    ? accessContext.assignedBatchIds
                    : [];
                if (assignedBatchIds.length === 0) {
                    return [];
                }
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM exam_batch_assignments eba_t
                    WHERE eba_t.exam_id = e.id AND eba_t.tenant_id = e.tenant_id AND eba_t.batch_id IN (?)
                )`;
                whereParams.push(assignedBatchIds);
            }
        }

        if (branchId && branchId !== 'All') {
            whereClause += ' AND e.branch_id = ?';
            whereParams.push(branchId);
        } else if (branchName && branchName !== 'All') {
            whereClause += ' AND br.name = ?';
            whereParams.push(branchName);
        }

        if (academicYearId) {
            whereClause += ' AND e.academic_year_id = ?';
            whereParams.push(academicYearId);
        }

        const batchFilter = batchId || batch;
        if (batchFilter && batchFilter !== 'All') {
            if (!Number.isNaN(Number(batchFilter))) {
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM exam_batch_assignments eba_f
                    WHERE eba_f.exam_id = e.id AND eba_f.tenant_id = e.tenant_id AND eba_f.batch_id = ?
                )`;
                whereParams.push(Number(batchFilter));
            } else {
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM exam_batch_assignments eba_f
                    JOIN batches bf ON eba_f.batch_id = bf.id AND bf.tenant_id = e.tenant_id
                    WHERE eba_f.exam_id = e.id AND eba_f.tenant_id = e.tenant_id AND bf.name = ?
                )`;
                whereParams.push(batchFilter);
            }
        }

        if (subjectId) {
            whereClause += ' AND e.subject_id = ?';
            whereParams.push(subjectId);
        } else if (subject && subject !== 'All') {
            whereClause += ' AND s.name = ?';
            whereParams.push(subject);
        }

        if (courseId && courseId !== 'All') {
            whereClause += ' AND c.id = ?';
            whereParams.push(courseId);
        } else if (course && course !== 'All') {
            whereClause += ' AND c.name = ?';
            whereParams.push(course);
        }

        const typeFilter = examType || type;
        if (typeFilter && typeFilter !== 'All') {
            whereClause += ' AND e.exam_type = ?';
            whereParams.push(typeFilter);
        }

        if (status && status !== 'All') {
            const lowerStatus = String(status).toLowerCase();
            if (lowerStatus === 'scheduled') {
                whereClause += ` AND LOWER(e.status) = 'scheduled'`;
            } else if (lowerStatus === 'marks published' || lowerStatus === 'published') {
                whereClause += ` AND (LOWER(e.status) IN ('marks published', 'published') OR (LOWER(e.status) = 'completed' AND COALESCE(em_stats.visible_marks_count, 0) > 0))`;
            } else if (lowerStatus === 'marks pending') {
                whereClause += ` AND (LOWER(e.status) IN ('marks pending', 'pending') OR (LOWER(e.status) = 'completed' AND COALESCE(em_stats.visible_marks_count, 0) = 0))`;
            } else {
                whereClause += ' AND LOWER(e.status) = ?';
                whereParams.push(lowerStatus);
            }
        }

        if (search) {
            whereClause += ' AND (e.name LIKE ? OR s.name LIKE ? OR e.description LIKE ?)';
            const term = `%${search}%`;
            whereParams.push(term, term, term);
        }

        const query = `
            SELECT
                e.id,
                e.tenant_id,
                e.branch_id,
                e.academic_year_id,
                e.subject_id,
                e.name,
                e.description,
                e.metadata,
                e.exam_type,
                e.max_marks,
                e.passing_marks,
                e.exam_date,
                e.start_time,
                e.end_time,
                e.status,
                e.created_at,
                e.updated_at,
                br.name AS branch_name,
                s.name AS subject_name,
                eba_p.primary_batch_id AS batch_id,
                eba_p.batch_names AS batch_name,
                eba_p.batch_ids AS batch_ids,
                c.id AS course_id,
                c.name AS course_name,
                COALESCE(em_stats.marks_entered_count, 0) AS marks_entered_count,
                COALESCE(em_stats.visible_marks_count, 0) AS visible_marks_count,
                em_stats.avg_marks AS avg_marks,
                COALESCE(se_stats.total_students_count, 0) AS total_students_count
            FROM exams e
            LEFT JOIN branches br ON e.branch_id = br.id AND br.tenant_id = e.tenant_id AND br.deleted_at IS NULL
            LEFT JOIN subjects s ON e.subject_id = s.id AND s.tenant_id = e.tenant_id AND s.deleted_at IS NULL
            LEFT JOIN (
                SELECT
                    eba.exam_id,
                    MIN(eba.batch_id) AS primary_batch_id,
                    GROUP_CONCAT(DISTINCT eba.batch_id ORDER BY eba.id SEPARATOR ',') AS batch_ids,
                    GROUP_CONCAT(DISTINCT b_agg.name ORDER BY b_agg.name SEPARATOR ', ') AS batch_names
                FROM exam_batch_assignments eba
                JOIN batches b_agg ON eba.batch_id = b_agg.id AND b_agg.deleted_at IS NULL
                GROUP BY eba.exam_id
            ) eba_p ON eba_p.exam_id = e.id
            LEFT JOIN batches b ON eba_p.primary_batch_id = b.id AND b.tenant_id = e.tenant_id AND b.deleted_at IS NULL
            LEFT JOIN levels l ON b.level_id = l.id AND l.tenant_id = e.tenant_id
            LEFT JOIN programs p ON (l.program_id = p.id OR (l.program_id IS NULL AND l.course_id = p.course_id)) AND p.tenant_id = e.tenant_id
            LEFT JOIN courses c ON (l.course_id = c.id OR p.course_id = c.id) AND c.tenant_id = e.tenant_id
            LEFT JOIN (
                SELECT
                    exam_id,
                    COUNT(CASE WHEN marks_obtained IS NOT NULL THEN 1 END) AS marks_entered_count,
                    SUM(CASE WHEN is_result_visible = 1 THEN 1 ELSE 0 END) AS visible_marks_count,
                    AVG(CASE WHEN is_absent = 0 THEN marks_obtained ELSE NULL END) AS avg_marks
                FROM exam_marks
                WHERE tenant_id = ? AND deleted_at IS NULL
                GROUP BY exam_id
            ) em_stats ON em_stats.exam_id = e.id
            LEFT JOIN (
                SELECT
                    eba.exam_id,
                    COUNT(DISTINCT se.student_id) AS total_students_count
                FROM exam_batch_assignments eba
                JOIN student_enrollments se ON se.batch_id = eba.batch_id AND se.tenant_id = eba.tenant_id
                WHERE eba.tenant_id = ?
                  AND se.deleted_at IS NULL
                  AND se.status IN ('active', 'completed', 'enrolled')
                GROUP BY eba.exam_id
            ) se_stats ON se_stats.exam_id = e.id
            ${whereClause}
            ORDER BY e.exam_date DESC, e.created_at DESC
        `;

        const [rows] = await db.query(query, [...joinsParams, ...whereParams]);
        return rows.map(formatExamRow);
    },

    /**
     * Get single exam details with marks summary.
     */
    async getExamById(tenantId, examId, accessContext = null) {
        let accessWhere = '';
        const params = [tenantId, tenantId, examId, tenantId];

        if (accessContext) {
            if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
                accessWhere += ' AND e.branch_id = ?';
                params.push(accessContext.authorizedBranchId);
            } else if (accessContext.scope === 'TEACHER') {
                const assignedBatchIds = Array.isArray(accessContext.assignedBatchIds)
                    ? accessContext.assignedBatchIds
                    : [];
                if (assignedBatchIds.length === 0) return null;
                accessWhere += ` AND EXISTS (
                    SELECT 1 FROM exam_batch_assignments eba_t
                    WHERE eba_t.exam_id = e.id AND eba_t.tenant_id = e.tenant_id AND eba_t.batch_id IN (?)
                )`;
                params.push(assignedBatchIds);
            }
        }

        const query = `
            SELECT
                e.*,
                br.name AS branch_name,
                s.name AS subject_name,
                eba_p.primary_batch_id AS batch_id,
                eba_p.batch_names AS batch_name,
                eba_p.batch_ids AS batch_ids,
                c.id AS course_id,
                c.name AS course_name,
                COALESCE(em_stats.marks_entered_count, 0) AS marks_entered_count,
                COALESCE(em_stats.visible_marks_count, 0) AS visible_marks_count,
                em_stats.avg_marks AS avg_marks,
                COALESCE(se_stats.total_students_count, 0) AS total_students_count
            FROM exams e
            LEFT JOIN branches br ON e.branch_id = br.id AND br.tenant_id = e.tenant_id AND br.deleted_at IS NULL
            LEFT JOIN subjects s ON e.subject_id = s.id AND s.tenant_id = e.tenant_id AND s.deleted_at IS NULL
            LEFT JOIN (
                SELECT
                    eba.exam_id,
                    MIN(eba.batch_id) AS primary_batch_id,
                    GROUP_CONCAT(DISTINCT eba.batch_id ORDER BY eba.id SEPARATOR ',') AS batch_ids,
                    GROUP_CONCAT(DISTINCT b_agg.name ORDER BY b_agg.name SEPARATOR ', ') AS batch_names
                FROM exam_batch_assignments eba
                JOIN batches b_agg ON eba.batch_id = b_agg.id AND b_agg.deleted_at IS NULL
                GROUP BY eba.exam_id
            ) eba_p ON eba_p.exam_id = e.id
            LEFT JOIN batches b ON eba_p.primary_batch_id = b.id AND b.tenant_id = e.tenant_id AND b.deleted_at IS NULL
            LEFT JOIN levels l ON b.level_id = l.id AND l.tenant_id = e.tenant_id
            LEFT JOIN programs p ON (l.program_id = p.id OR (l.program_id IS NULL AND l.course_id = p.course_id)) AND p.tenant_id = e.tenant_id
            LEFT JOIN courses c ON (l.course_id = c.id OR p.course_id = c.id) AND c.tenant_id = e.tenant_id
            LEFT JOIN (
                SELECT
                    exam_id,
                    COUNT(CASE WHEN marks_obtained IS NOT NULL THEN 1 END) AS marks_entered_count,
                    SUM(CASE WHEN is_result_visible = 1 THEN 1 ELSE 0 END) AS visible_marks_count,
                    AVG(CASE WHEN is_absent = 0 THEN marks_obtained ELSE NULL END) AS avg_marks
                FROM exam_marks
                WHERE tenant_id = ? AND deleted_at IS NULL
                GROUP BY exam_id
            ) em_stats ON em_stats.exam_id = e.id
            LEFT JOIN (
                SELECT exam_id, COUNT(DISTINCT se.student_id) AS total_students_count
                FROM exam_batch_assignments eba
                JOIN student_enrollments se ON se.batch_id = eba.batch_id AND se.tenant_id = eba.tenant_id
                WHERE eba.tenant_id = ? AND se.deleted_at IS NULL
                GROUP BY eba.exam_id
            ) se_stats ON se_stats.exam_id = e.id
            WHERE e.id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL ${accessWhere}
        `;

        const [rows] = await db.query(query, params);
        if (rows.length === 0) return null;

        const exam = formatExamRow(rows[0]);

        const [marksRows] = await db.query(
            `SELECT
                em.id,
                em.exam_id,
                em.enrollment_id,
                COALESCE(em.student_id, se.student_id) AS student_id,
                em.marks_obtained,
                em.is_absent,
                em.grade,
                em.remarks,
                em.status,
                em.is_result_visible,
                em.updated_at,
                st.full_name AS student_name,
                st.student_code
             FROM exam_marks em
             LEFT JOIN student_enrollments se ON em.enrollment_id = se.id AND se.tenant_id = em.tenant_id
             JOIN students st ON COALESCE(em.student_id, se.student_id) = st.id AND st.tenant_id = em.tenant_id
             WHERE em.exam_id = ? AND em.tenant_id = ? AND em.deleted_at IS NULL
             ORDER BY st.full_name ASC`,
            [examId, tenantId]
        );

        const maxMarks = Number(exam.max_marks || 100);
        const passingMarks = Number(exam.passing_marks ?? (maxMarks * 0.4));

        const marks = marksRows.map((m) => {
            const isAbsent = Boolean(m.is_absent);
            const marksVal = !isAbsent && m.marks_obtained !== null ? Number(m.marks_obtained) : null;
            const percentage = marksVal !== null && maxMarks > 0
                ? Number(((marksVal / maxMarks) * 100).toFixed(2))
                : 0;
            const isPassed = isAbsent ? false : (marksVal !== null ? marksVal >= passingMarks : false);

            return {
                ...m,
                marks_obtained: marksVal,
                is_absent: isAbsent,
                percentage,
                is_passed: isPassed,
            };
        });

        return { ...exam, marks };
    },

    /**
     * Create a new exam and assign its target batch(es).
     */
    async createExam(tenantId, examData, userId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const {
                resolvedBatchId,
                resolvedBranchId,
                resolvedAcademicYearId,
                resolvedSubjectId,
            } = await resolveExamReferences(conn, tenantId, examData, userId);

            const name = examData.title || examData.name;
            const examType = examData.examType || examData.exam_type || examData.type || 'Unit Test';
            const maxMarks = Number(examData.totalMarks ?? examData.maxMarks ?? examData.max_marks ?? examData.total_marks ?? 100);
            const passingMarks = examData.passingMarks !== undefined && examData.passingMarks !== null
                ? Number(examData.passingMarks)
                : Math.round(maxMarks * 0.4);
            const examDate = examData.examDate || examData.exam_date;
            const startTime = examData.startTime || examData.start_time || null;
            const duration = examData.duration || '90 mins';
            const endTime = computeEndTime(startTime, duration, examData.endTime || examData.end_time);
            const instructions = examData.instructions || examData.description || null;
            const status = String(examData.status || 'Scheduled').slice(0, 20);

            const metadata = {
                duration: String(duration),
                instructions: instructions || '',
                subject: examData.subject || examData.subjectName || undefined,
            };

            const [result] = await conn.query(
                `INSERT INTO exams (
                    tenant_id, branch_id, academic_year_id, subject_id,
                    name, description, metadata, exam_type,
                    max_marks, passing_marks, exam_date, start_time, end_time,
                    status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId,
                    resolvedBranchId,
                    resolvedAcademicYearId,
                    resolvedSubjectId,
                    name,
                    instructions,
                    JSON.stringify(metadata),
                    examType,
                    maxMarks,
                    passingMarks,
                    examDate,
                    startTime,
                    endTime,
                    status,
                    userId || null,
                    userId || null,
                ]
            );

            const examId = result.insertId;

            const batchIdsToAssign = [];
            if (Array.isArray(examData.batchIds) && examData.batchIds.length > 0) {
                for (const bid of examData.batchIds) {
                    if (!Number.isNaN(Number(bid))) batchIdsToAssign.push(Number(bid));
                }
            } else if (resolvedBatchId) {
                batchIdsToAssign.push(resolvedBatchId);
            }

            for (const bid of batchIdsToAssign) {
                await conn.query(
                    `INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)`,
                    [tenantId, examId, bid]
                );
            }

            await conn.commit();
            return this.getExamById(tenantId, examId);
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    /**
     * Update an existing exam.
     */
    async updateExam(tenantId, examId, examData, userId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [existingRows] = await conn.query(
                `SELECT * FROM exams WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                [examId, tenantId]
            );
            if (existingRows.length === 0) {
                await conn.rollback();
                return null;
            }
            const existing = existingRows[0];
            const existingMeta = parseMetadata(existing.metadata);

            const updates = [];
            const params = [];

            const nameVal = examData.title ?? examData.name;
            if (nameVal !== undefined) {
                updates.push('name = ?');
                params.push(nameVal);
            }

            const typeVal = examData.examType ?? examData.exam_type ?? examData.type;
            if (typeVal !== undefined) {
                updates.push('exam_type = ?');
                params.push(typeVal);
            }

            const dateVal = examData.examDate ?? examData.exam_date;
            if (dateVal !== undefined) {
                updates.push('exam_date = ?');
                params.push(dateVal);
            }

            const startVal = examData.startTime ?? examData.start_time;
            if (startVal !== undefined) {
                updates.push('start_time = ?');
                params.push(startVal);
            }

            const maxMarksVal = examData.totalMarks ?? examData.maxMarks ?? examData.max_marks ?? examData.total_marks;
            if (maxMarksVal !== undefined) {
                updates.push('max_marks = ?');
                params.push(Number(maxMarksVal));
            }

            const passingVal = examData.passingMarks ?? examData.passing_marks;
            if (passingVal !== undefined) {
                updates.push('passing_marks = ?');
                params.push(Number(passingVal));
            }

            const descVal = examData.instructions ?? examData.description;
            if (descVal !== undefined) {
                updates.push('description = ?');
                params.push(descVal);
                existingMeta.instructions = descVal || '';
            }

            if (examData.duration !== undefined) {
                existingMeta.duration = String(examData.duration);
                const effectiveStart = startVal !== undefined ? startVal : existing.start_time;
                const endVal = computeEndTime(effectiveStart, examData.duration, examData.endTime ?? examData.end_time);
                if (endVal) {
                    updates.push('end_time = ?');
                    params.push(endVal);
                }
            }

            if (examData.status !== undefined) {
                updates.push('status = ?');
                params.push(String(examData.status).slice(0, 20));
            }

            // Handle optional subject update
            if (examData.subjectId !== undefined || examData.subject !== undefined) {
                const refs = await resolveExamReferences(conn, tenantId, examData, userId);
                if (refs.resolvedSubjectId) {
                    updates.push('subject_id = ?');
                    params.push(refs.resolvedSubjectId);
                }
            }

            updates.push('metadata = ?');
            params.push(JSON.stringify(existingMeta));

            updates.push('updated_by = ?');
            params.push(userId || null);

            await conn.query(
                `UPDATE exams SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
                [...params, examId, tenantId]
            );

            // Optional batch reassignment
            if (examData.batchId !== undefined || examData.batchName !== undefined || examData.batch !== undefined || Array.isArray(examData.batchIds)) {
                const refs = await resolveExamReferences(conn, tenantId, examData, userId);
                const newBatchIds = Array.isArray(examData.batchIds)
                    ? examData.batchIds.map(Number).filter(Boolean)
                    : (refs.resolvedBatchId ? [refs.resolvedBatchId] : []);

                if (newBatchIds.length > 0) {
                    await conn.query(
                        `DELETE FROM exam_batch_assignments WHERE exam_id = ? AND tenant_id = ?`,
                        [examId, tenantId]
                    );
                    for (const bid of newBatchIds) {
                        await conn.query(
                            `INSERT IGNORE INTO exam_batch_assignments (tenant_id, exam_id, batch_id) VALUES (?, ?, ?)`,
                            [tenantId, examId, bid]
                        );
                    }
                }
            }

            await conn.commit();
            return this.getExamById(tenantId, examId);
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    /**
     * Soft delete an exam.
     */
    async deleteExam(tenantId, examId, userId = null) {
        const [result] = await db.query(
            `UPDATE exams SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [userId || null, examId, tenantId]
        );
        return result.affectedRows > 0;
    },

    /**
     * Get the enrolled student roster for an exam along with any entered marks.
     */
    async getExamRoster(tenantId, examId, accessContext = null) {
        const exam = await this.getExamById(tenantId, examId, accessContext);
        if (!exam) return null;

        const batchIds = Array.isArray(exam.batch_ids) && exam.batch_ids.length > 0
            ? exam.batch_ids
            : (exam.batch_id ? [exam.batch_id] : []);

        if (batchIds.length === 0) {
            return { exam, roster: [] };
        }

        const query = `
            SELECT
                st.id AS student_id,
                st.student_code AS student_code,
                st.full_name AS student_name,
                st.email AS student_email,
                st.mobile AS student_mobile,
                se.id AS enrollment_id,
                se.batch_id,
                bat.name AS batch_name,
                c.name AS course_name,
                em.id AS mark_id,
                em.marks_obtained,
                em.is_absent,
                em.grade,
                em.remarks,
                em.status AS mark_status,
                em.is_result_visible,
                em.updated_at AS graded_at
            FROM student_enrollments se
            JOIN students st
              ON se.student_id = st.id
             AND st.tenant_id = se.tenant_id
             AND st.deleted_at IS NULL
            JOIN batches bat
              ON se.batch_id = bat.id
             AND bat.tenant_id = se.tenant_id
             AND bat.deleted_at IS NULL
            LEFT JOIN levels l
              ON bat.level_id = l.id
             AND l.tenant_id = bat.tenant_id
            LEFT JOIN programs p
              ON (l.program_id = p.id OR (l.program_id IS NULL AND l.course_id = p.course_id))
             AND p.tenant_id = bat.tenant_id
            LEFT JOIN courses c
              ON (l.course_id = c.id OR p.course_id = c.id)
             AND c.tenant_id = bat.tenant_id
            LEFT JOIN exam_marks em
              ON em.exam_id = ?
             AND em.enrollment_id = se.id
             AND em.tenant_id = ?
             AND em.deleted_at IS NULL
            WHERE se.tenant_id = ?
              AND se.batch_id IN (?)
              AND se.deleted_at IS NULL
              AND se.status IN ('active', 'completed', 'enrolled')
            ORDER BY st.full_name ASC
        `;

        const [students] = await db.query(query, [examId, tenantId, tenantId, batchIds]);

        const totalMarks = Number(exam.max_marks || exam.total_marks || 100);
        const passingMarks = Number(exam.passing_marks ?? (totalMarks * 0.4));

        const roster = students.map((s) => {
            const isAbsent = Boolean(s.is_absent);
            const hasScore = !isAbsent && s.marks_obtained !== null && s.marks_obtained !== undefined;
            const marksObtained = hasScore ? Number(s.marks_obtained) : null;
            const percentage = hasScore && totalMarks > 0
                ? Number(((marksObtained / totalMarks) * 100).toFixed(2))
                : (isAbsent ? 0 : null);
            const isPassed = isAbsent ? false : (hasScore ? marksObtained >= passingMarks : null);
            const grade = isAbsent
                ? 'AB'
                : (s.grade || (percentage !== null ? this.calculateGrade(percentage) : null));

            return {
                studentId: s.student_id,
                enrollmentId: s.enrollment_id,
                studentCode: s.student_code,
                studentName: s.student_name,
                studentEmail: s.student_email,
                studentMobile: s.student_mobile,
                rollNo: s.student_code || `ST-${s.student_id}`,
                batchId: s.batch_id,
                batchName: s.batch_name,
                courseName: s.course_name || exam.course_name || null,
                marksObtained,
                isAbsent,
                percentage,
                grade,
                isPassed,
                remarks: s.remarks || '',
                gradedAt: s.graded_at || null,
            };
        });

        return { exam, roster };
    },

    /**
     * Save or bulk-update student marks for an exam.
     */
    async saveExamMarks(tenantId, examId, marksPayload, userId, publish = false) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [examRows] = await connection.query(
                `SELECT id, max_marks, passing_marks, status, metadata
                 FROM exams
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
                 LIMIT 1`,
                [examId, tenantId]
            );
            if (examRows.length === 0) {
                const err = new Error('Exam not found');
                err.statusCode = 404;
                throw err;
            }
            const exam = examRows[0];
            const totalMarks = Number(exam.max_marks || 100);
            const existingMeta = parseMetadata(exam.metadata);

            const [assignedBatches] = await connection.query(
                `SELECT batch_id FROM exam_batch_assignments WHERE exam_id = ? AND tenant_id = ?`,
                [examId, tenantId]
            );
            const assignedBatchIds = assignedBatches.map((b) => Number(b.batch_id)).filter(Boolean);

            const studentIds = marksPayload
                .map((m) => Number(m.studentId ?? m.student_id))
                .filter(Boolean);

            const enrollmentByStudent = new Map();
            if (studentIds.length > 0) {
                const [enrRows] = await connection.query(
                    `SELECT id, student_id, batch_id, status
                     FROM student_enrollments
                     WHERE tenant_id = ?
                       AND student_id IN (?)
                       AND deleted_at IS NULL
                     ORDER BY FIELD(status, 'active', 'enrolled', 'completed'), id DESC`,
                    [tenantId, studentIds]
                );

                for (const row of enrRows) {
                    const sid = Number(row.student_id);
                    const matchesExamBatch = assignedBatchIds.includes(Number(row.batch_id));
                    const prev = enrollmentByStudent.get(sid);
                    if (!prev || (!prev.matchesExamBatch && matchesExamBatch)) {
                        enrollmentByStudent.set(sid, {
                            enrollmentId: row.id,
                            matchesExamBatch,
                        });
                    }
                }
            }

            const alreadyPublished = String(exam.status || '').toLowerCase() === 'marks published'
                || String(exam.status || '').toLowerCase() === 'published';
            const visibleFlag = publish || alreadyPublished ? 1 : 0;

            for (const entry of marksPayload) {
                const studentId = Number(entry.studentId ?? entry.student_id);
                const resolvedFromMap = studentId ? enrollmentByStudent.get(studentId)?.enrollmentId : null;
                const enrollmentId = Number(entry.enrollmentId ?? entry.enrollment_id ?? resolvedFromMap);

                if (!enrollmentId) continue;

                const isAbsent = Boolean(entry.isAbsent ?? entry.is_absent);
                const rawMarks = entry.marksObtained ?? entry.marks_obtained;
                const hasNumericMarks = !isAbsent && rawMarks !== null && rawMarks !== undefined && rawMarks !== '';
                const marksVal = hasNumericMarks ? Number(rawMarks) : null;

                let percentage = 0;
                if (hasNumericMarks && totalMarks > 0) {
                    percentage = Number(((marksVal / totalMarks) * 100).toFixed(2));
                }

                const grade = isAbsent
                    ? 'AB'
                    : (entry.grade || (marksVal !== null ? this.calculateGrade(percentage) : null));
                const remarks = entry.remarks || null;
                const markStatus = isAbsent ? 'absent' : (marksVal !== null ? 'graded' : 'pending');

                const [existing] = await connection.query(
                    `SELECT id, marks_obtained
                     FROM exam_marks
                     WHERE exam_id = ? AND enrollment_id = ? AND tenant_id = ?
                     LIMIT 1`,
                    [examId, enrollmentId, tenantId]
                );

                if (existing.length > 0) {
                    const oldMarks = existing[0].marks_obtained !== null ? Number(existing[0].marks_obtained) : null;
                    if (oldMarks !== marksVal && studentId) {
                        await connection.query(
                            `INSERT INTO exam_marks_audit (
                                tenant_id, exam_id, student_id, old_marks, new_marks, changed_by, change_reason
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [tenantId, examId, studentId, oldMarks, marksVal, userId || null, 'Score update']
                        );
                    }

                    await connection.query(
                        `UPDATE exam_marks
                         SET student_id = COALESCE(student_id, ?),
                             marks_obtained = ?,
                             is_absent = ?,
                             grade = ?,
                             remarks = ?,
                             status = ?,
                             is_result_visible = ?,
                             deleted_at = NULL,
                             updated_by = ?
                         WHERE id = ?`,
                        [
                            studentId || null,
                            marksVal,
                            isAbsent ? 1 : 0,
                            grade,
                            remarks,
                            markStatus,
                            visibleFlag,
                            userId || null,
                            existing[0].id,
                        ]
                    );
                } else {
                    await connection.query(
                        `INSERT INTO exam_marks (
                            tenant_id, exam_id, enrollment_id, student_id,
                            marks_obtained, is_absent, grade, remarks,
                            status, is_result_visible, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            tenantId,
                            examId,
                            enrollmentId,
                            studentId || null,
                            marksVal,
                            isAbsent ? 1 : 0,
                            grade,
                            remarks,
                            markStatus,
                            visibleFlag,
                            userId || null,
                            userId || null,
                        ]
                    );
                }
            }

            const [avgRows] = await connection.query(
                `SELECT AVG(marks_obtained) AS avg_marks
                 FROM exam_marks
                 WHERE exam_id = ? AND tenant_id = ? AND deleted_at IS NULL AND is_absent = 0 AND marks_obtained IS NOT NULL`,
                [examId, tenantId]
            );
            const classAverage = avgRows[0]?.avg_marks !== null && avgRows[0]?.avg_marks !== undefined
                ? Number(Number(avgRows[0].avg_marks).toFixed(2))
                : null;

            if (classAverage !== null) {
                existingMeta.class_average = classAverage;
            }

            const newStatus = publish
                ? 'Marks Published'
                : (alreadyPublished ? 'Marks Published' : 'Marks Pending');

            await connection.query(
                `UPDATE exams SET status = ?, metadata = ?, updated_by = ? WHERE id = ? AND tenant_id = ?`,
                [newStatus, JSON.stringify(existingMeta), userId || null, examId, tenantId]
            );

            if (publish) {
                await connection.query(
                    `UPDATE exam_marks SET is_result_visible = 1, updated_by = ? WHERE exam_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                    [userId || null, examId, tenantId]
                );
                await connection.query(
                    `INSERT INTO exam_result_publish_logs (tenant_id, exam_id, action, published_by) VALUES (?, ?, 'published', ?)`,
                    [tenantId, examId, userId || null]
                );
            }

            await connection.commit();
            return this.getExamById(tenantId, examId);
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    /**
     * Publish exam results so students/parents can view them.
     */
    async publishResults(tenantId, examId, userId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `UPDATE exams SET status = 'Marks Published', updated_by = ?
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [userId || null, examId, tenantId]
            );
            if (result.affectedRows === 0) {
                await conn.rollback();
                return null;
            }

            await conn.query(
                `UPDATE exam_marks SET is_result_visible = 1, updated_by = ?
                 WHERE exam_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [userId || null, examId, tenantId]
            );

            await conn.query(
                `INSERT INTO exam_result_publish_logs (tenant_id, exam_id, action, published_by)
                 VALUES (?, ?, 'published', ?)`,
                [tenantId, examId, userId || null]
            );

            await conn.commit();
            return this.getExamById(tenantId, examId);
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    /**
     * Get published report card data for a specific student.
     */
    async getStudentReportCard(tenantId, studentId) {
        const query = `
            SELECT
                e.id AS exam_id,
                e.name AS exam_name,
                e.exam_type,
                s.name AS subject,
                e.exam_date,
                e.max_marks AS total_marks,
                e.passing_marks,
                e.metadata,
                b.name AS batch_name,
                em.marks_obtained,
                em.is_absent,
                em.grade,
                em.remarks
            FROM exam_marks em
            JOIN exams e ON em.exam_id = e.id AND e.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON em.enrollment_id = se.id AND se.tenant_id = em.tenant_id
            LEFT JOIN subjects s ON e.subject_id = s.id AND s.tenant_id = e.tenant_id
            LEFT JOIN (
                SELECT exam_id, MIN(batch_id) AS batch_id
                FROM exam_batch_assignments
                GROUP BY exam_id
            ) eba ON eba.exam_id = e.id
            LEFT JOIN batches b ON COALESCE(se.batch_id, eba.batch_id) = b.id AND b.tenant_id = e.tenant_id
            WHERE (em.student_id = ? OR se.student_id = ?)
              AND em.tenant_id = ?
              AND em.deleted_at IS NULL
              AND (
                  LOWER(e.status) IN ('marks published', 'published', 'completed')
                  OR em.is_result_visible = 1
              )
            ORDER BY e.exam_date DESC
        `;

        const [rows] = await db.query(query, [studentId, studentId, tenantId]);

        return rows.map((r) => {
            const meta = parseMetadata(r.metadata);
            const totalMarks = Number(r.total_marks || 100);
            const passingMarks = r.passing_marks !== null && r.passing_marks !== undefined
                ? Number(r.passing_marks)
                : Math.round(totalMarks * 0.4);
            const isAbsent = Boolean(r.is_absent);
            const marksObtained = !isAbsent && r.marks_obtained !== null ? Number(r.marks_obtained) : null;
            const percentage = marksObtained !== null && totalMarks > 0
                ? Number(((marksObtained / totalMarks) * 100).toFixed(2))
                : 0;
            const isPassed = !isAbsent && marksObtained !== null ? marksObtained >= passingMarks : false;

            return {
                exam_id: r.exam_id,
                exam_name: r.exam_name,
                exam_type: r.exam_type,
                subject: r.subject || meta.subject || 'General',
                exam_date: r.exam_date instanceof Date ? r.exam_date.toISOString().slice(0, 10) : r.exam_date,
                total_marks: totalMarks,
                passing_marks: passingMarks,
                class_average: meta.class_average ?? null,
                batch_name: r.batch_name || null,
                marks_obtained: marksObtained,
                is_absent: isAbsent,
                percentage,
                grade: isAbsent ? 'AB' : (r.grade || this.calculateGrade(percentage)),
                is_passed: isPassed,
                remarks: r.remarks || '',
            };
        });
    },
};

module.exports = examModel;
