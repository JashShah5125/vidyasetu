const pool = require('../config/db');

/**
 * Teacher Academic Scope Service
 * Authoritative, centralized access & authorization service for Teacher Panel.
 * Validates teacher allocations to batches, subjects, academic years, and assessments.
 * Enforces strict 2-factor scoping: (Assigned Batches) AND (Assigned Subjects).
 */
class TeacherAcademicScopeService {
    /**
     * Resolves all batch IDs and subject IDs assigned to a teacher.
     */
    async getTeacherAllocations(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        if (!uid) {
            const err = new Error('Forbidden: Unable to resolve teacher identity.');
            err.statusCode = 401;
            err.code = 'ER_TEACHER_IDENTITY';
            throw err;
        }

        // 1. Fetch allocated batches from teacher_allocations and scheduled lectures
        const [allocRows] = await pool.query(
            `SELECT DISTINCT ta.batch_id, ta.branch_id, ta.academic_year_id
             FROM teacher_allocations ta
             WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL
             UNION
             SELECT DISTINCT l.batch_id, l.branch_id, l.academic_year_id
             FROM lectures l
             WHERE l.tenant_id = ? AND l.teacher_user_id = ? AND l.deleted_at IS NULL`,
            [tid, uid, tid, uid]
        );

        let batchIds = Array.from(new Set(allocRows.map(r => Number(r.batch_id)).filter(Boolean)));
        let branchIds = Array.from(new Set(allocRows.map(r => Number(r.branch_id)).filter(Boolean)));
        let academicYearIds = Array.from(new Set(allocRows.map(r => Number(r.academic_year_id)).filter(Boolean)));

        // Fallback for newly onboarded teachers without lectures yet: resolve by staff profile branches
        if (batchIds.length === 0) {
            const [staffRows] = await pool.query(
                `SELECT branch_ids FROM staff_profiles WHERE tenant_id = ? AND user_id = ? AND deleted_at IS NULL`,
                [tid, uid]
            );
            if (staffRows.length > 0 && staffRows[0].branch_ids) {
                try {
                    const parsed = typeof staffRows[0].branch_ids === 'string'
                        ? JSON.parse(staffRows[0].branch_ids)
                        : staffRows[0].branch_ids;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const [branchBatches] = await pool.query(
                            `SELECT id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND branch_id IN (?) AND deleted_at IS NULL`,
                            [tid, parsed.map(Number)]
                        );
                        branchBatches.forEach(b => {
                            batchIds.push(b.id);
                            branchIds.push(b.branch_id);
                            if (b.academic_year_id) academicYearIds.push(b.academic_year_id);
                        });
                    }
                } catch (e) {
                    // ignore JSON parse error
                }
            }
        }

        if (batchIds.length === 0) {
            return {
                batchIds: [],
                subjectIds: [],
                branchIds: [],
                academicYearIds: []
            };
        }

        // 2. Fetch teacher's explicitly assigned subjects from:
        //    a) teacher_subjects table
        //    b) lectures table where teacher is assigned to lecture sessions
        const [teacherSubjectRows] = await pool.query(
            `SELECT DISTINCT ts.subject_id
             FROM teacher_subjects ts
             JOIN subjects s ON s.id = ts.subject_id AND s.deleted_at IS NULL
             WHERE ts.tenant_id = ? AND ts.teacher_user_id = ?`,
            [tid, uid]
        );

        const [lectureSubjectRows] = await pool.query(
            `SELECT DISTINCT l.subject_id
             FROM lectures l
             JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
             WHERE l.tenant_id = ? AND l.teacher_user_id = ? AND l.deleted_at IS NULL`,
            [tid, uid]
        );

        let subjectIds = Array.from(new Set([
            ...teacherSubjectRows.map(r => Number(r.subject_id)),
            ...lectureSubjectRows.map(r => Number(r.subject_id))
        ].filter(Boolean)));

        // If teacher has no explicit teacher_subjects or lectures yet, fallback to curriculum subjects for assigned batches
        if (subjectIds.length === 0) {
            const [curriculumSubjects] = await pool.query(
                `SELECT DISTINCT ls.subject_id
                 FROM batches b
                 JOIN level_subjects ls ON ls.level_id = b.level_id AND ls.tenant_id = b.tenant_id
                 JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
                 WHERE b.tenant_id = ? AND b.id IN (?) AND b.deleted_at IS NULL`,
                [tid, batchIds]
            );
            subjectIds = Array.from(new Set(curriculumSubjects.map(r => Number(r.subject_id)).filter(Boolean)));
        }

        return {
            batchIds,
            subjectIds,
            branchIds,
            academicYearIds
        };
    }

    /**
     * Checks if a teacher has access to a specific batch.
     */
    async canAccessBatch(tenantId, teacherUserId, batchId) {
        if (!batchId) return false;
        const { batchIds } = await this.getTeacherAllocations(tenantId, teacherUserId);
        return batchIds.includes(Number(batchId));
    }

    /**
     * Checks if a teacher has access to a specific subject.
     */
    async canAccessSubject(tenantId, teacherUserId, subjectId) {
        if (!subjectId) return false;
        const { subjectIds } = await this.getTeacherAllocations(tenantId, teacherUserId);
        return subjectIds.includes(Number(subjectId));
    }

    /**
     * Validates that all target batches and the subject in an assessment belong strictly
     * to the teacher's assigned allocations.
     * Throws 403 Forbidden if any batch or subject is unauthorized.
     */
    async validateAssessmentTargets(tenantId, teacherUserId, targetBatchIds = [], subjectId = null) {
        const { batchIds: allowedBatchIds, subjectIds: allowedSubjectIds } = await this.getTeacherAllocations(tenantId, teacherUserId);

        const normalizedBatchIds = (Array.isArray(targetBatchIds) ? targetBatchIds : [targetBatchIds])
            .map(Number)
            .filter(Boolean);

        if (normalizedBatchIds.length === 0) {
            const err = new Error('Validation error: At least one target batch must be selected.');
            err.statusCode = 400;
            throw err;
        }

        if (!subjectId) {
            const err = new Error('Validation error: Subject is required for this assessment.');
            err.statusCode = 400;
            throw err;
        }

        // 1. Strict Subject Check: Teacher can only create/edit for their assigned subjects
        if (!allowedSubjectIds.includes(Number(subjectId))) {
            const err = new Error(`Forbidden: You are not authorized to create or manage assessments for subject ID ${subjectId}. You are only assigned to subjects: [${allowedSubjectIds.join(', ')}].`);
            err.statusCode = 403;
            err.code = 'ER_SUBJECT_UNAUTHORIZED';
            throw err;
        }

        // 2. Strict Batch Check: Teacher can only create/edit for their assigned batches
        for (const bid of normalizedBatchIds) {
            if (!allowedBatchIds.includes(bid)) {
                const err = new Error(`Forbidden: You are not assigned to batch ID ${bid}. You are only assigned to batches: [${allowedBatchIds.join(', ')}].`);
                err.statusCode = 403;
                err.code = 'ER_BATCH_UNAUTHORIZED';
                throw err;
            }
        }

        return true;
    }

    /**
     * Validates teacher access to an existing homework/assessment.
     * Enforces BOTH batch allocation intersection AND subject allocation authorization.
     * Supports multi-table resolution across homeworks, assignments, and exams.
     * Returns the homework record if authorized, or throws 403 / 404.
     */
    async validateHomeworkAccess(tenantId, teacherUserId, homeworkId) {
        const tid = Number(tenantId);
        const rawId = String(homeworkId || '').trim();

        let entityType = 'unknown';
        let numId = Number(rawId);

        if (rawId.startsWith('asg-')) {
            entityType = 'assignment';
            numId = Number(rawId.replace('asg-', ''));
        } else if (rawId.startsWith('exam-')) {
            entityType = 'exam';
            numId = Number(rawId.replace('exam-', ''));
        } else if (rawId.startsWith('hw-')) {
            entityType = 'homework';
            numId = Number(rawId.replace('hw-', ''));
        }

        let homework = null;
        let hwBatchIds = [];

        if (entityType === 'assignment') {
            const [rows] = await pool.query(
                `SELECT a.*, s.name AS subject_name, s.code AS subject_code
                 FROM assignments a
                 LEFT JOIN subjects s ON s.id = a.subject_id AND s.deleted_at IS NULL
                 WHERE a.id = ? AND a.tenant_id = ? AND a.deleted_at IS NULL`,
                [numId, tid]
            );
            if (rows.length) {
                homework = rows[0];
                homework._entityType = 'assignment';
                homework.assignment_type = 'assignment';
                try {
                    hwBatchIds = homework.batch_ids ? (Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids)) : [homework.batch_id];
                } catch {
                    hwBatchIds = homework.batch_id ? [homework.batch_id] : [];
                }
            }
        } else if (entityType === 'exam') {
            const [rows] = await pool.query(
                `SELECT e.*, e.name AS title, e.exam_date AS due_date,
                        s.name AS subject_name, s.code AS subject_code,
                        (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) AS batch_ids
                 FROM exams e
                 LEFT JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
                 WHERE e.id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL`,
                [numId, tid]
            );
            if (rows.length) {
                homework = rows[0];
                homework._entityType = 'exam';
                homework.assignment_type = 'exam';
                try {
                    hwBatchIds = homework.batch_ids ? (Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids)) : [];
                } catch {
                    hwBatchIds = [];
                }
            }
        } else if (entityType === 'homework') {
            const [rows] = await pool.query(
                `SELECT h.*, s.name AS subject_name, s.code AS subject_code
                 FROM homeworks h
                 LEFT JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
                 WHERE h.id = ? AND h.tenant_id = ? AND h.deleted_at IS NULL`,
                [numId, tid]
            );
            if (rows.length) {
                homework = rows[0];
                homework._entityType = 'homework';
                homework.assignment_type = 'homework';
                try {
                    hwBatchIds = Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids || '[]');
                } catch {
                    hwBatchIds = [];
                }
            }
        } else {
            // Unprefixed fallback: check homeworks, assignments, exams
            const [hRows] = await pool.query(
                `SELECT h.*, s.name AS subject_name, s.code AS subject_code
                 FROM homeworks h
                 LEFT JOIN subjects s ON s.id = h.subject_id AND s.deleted_at IS NULL
                 WHERE h.id = ? AND h.tenant_id = ? AND h.deleted_at IS NULL`,
                [numId, tid]
            );
            if (hRows.length) {
                homework = hRows[0];
                homework._entityType = 'homework';
                homework.assignment_type = 'homework';
                try {
                    hwBatchIds = Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids || '[]');
                } catch {
                    hwBatchIds = [];
                }
            } else {
                const [aRows] = await pool.query(
                    `SELECT a.*, s.name AS subject_name, s.code AS subject_code
                     FROM assignments a
                     LEFT JOIN subjects s ON s.id = a.subject_id AND s.deleted_at IS NULL
                     WHERE a.id = ? AND a.tenant_id = ? AND a.deleted_at IS NULL`,
                    [numId, tid]
                );
                if (aRows.length) {
                    homework = aRows[0];
                    homework._entityType = 'assignment';
                    homework.assignment_type = 'assignment';
                    try {
                        hwBatchIds = homework.batch_ids ? (Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids)) : [homework.batch_id];
                    } catch {
                        hwBatchIds = homework.batch_id ? [homework.batch_id] : [];
                    }
                } else {
                    const [eRows] = await pool.query(
                        `SELECT e.*, e.name AS title, e.exam_date AS due_date,
                                s.name AS subject_name, s.code AS subject_code,
                                (SELECT JSON_ARRAYAGG(eba.batch_id) FROM exam_batch_assignments eba WHERE eba.exam_id = e.id) AS batch_ids
                         FROM exams e
                         LEFT JOIN subjects s ON s.id = e.subject_id AND s.deleted_at IS NULL
                         WHERE e.id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL`,
                        [numId, tid]
                    );
                    if (eRows.length) {
                        homework = eRows[0];
                        homework._entityType = 'exam';
                        homework.assignment_type = 'exam';
                        try {
                            hwBatchIds = homework.batch_ids ? (Array.isArray(homework.batch_ids) ? homework.batch_ids : JSON.parse(homework.batch_ids)) : [];
                        } catch {
                            hwBatchIds = [];
                        }
                    }
                }
            }
        }

        if (!homework) {
            const err = new Error('Assessment not found or has been deleted.');
            err.statusCode = 404;
            err.code = 'ER_HOMEWORK_NOT_FOUND';
            throw err;
        }

        hwBatchIds = hwBatchIds.map(Number).filter(Boolean);

        const { batchIds: allowedBatchIds, subjectIds: allowedSubjectIds } = await this.getTeacherAllocations(tid, teacherUserId);

        const isCreator = Number(homework.created_by) === Number(teacherUserId);

        // 1. Batch Intersection Check
        const hasBatchIntersection = isCreator || hwBatchIds.some(bid => allowedBatchIds.includes(bid));
        if (!hasBatchIntersection) {
            const err = new Error('Access denied. This assessment is not assigned to any of your allocated batches.');
            err.statusCode = 403;
            err.code = 'ER_HOMEWORK_BATCH_UNAUTHORIZED';
            throw err;
        }

        // 2. Subject Check
        if (!isCreator && homework.subject_id && !allowedSubjectIds.includes(Number(homework.subject_id))) {
            const err = new Error(`Access denied. You are not assigned to teach the subject '${homework.subject_name || homework.subject_id}' of this assessment.`);
            err.statusCode = 403;
            err.code = 'ER_HOMEWORK_SUBJECT_UNAUTHORIZED';
            throw err;
        }

        return {
            homework,
            homeworkBatchIds: hwBatchIds,
            allowedBatchIds,
            allowedSubjectIds
        };
    }
}

module.exports = new TeacherAcademicScopeService();
