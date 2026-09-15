const pool = require('../config/db');
const studentAccessService = require('./studentAccessService');
const teacherAcademicScopeService = require('./teacherAcademicScopeService');

/**
 * Teacher Student Service
 * Implements read-only, teacher-scoped student roster and profile retrieval.
 * Authoritative security model:
 *   Teacher -> teacher_allocations -> Assigned Batches -> student_enrollments -> Students
 * Financial/fee details are strictly excluded from all teacher responses.
 */
class TeacherStudentService {
    /**
     * Get filter options scoped strictly to the teacher's assigned batches and derived academic hierarchy.
     */
    async getTeacherOptions(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const accessContext = await studentAccessService.resolveTeacherAccessContext(tid, { userId: teacherUserId });
        const assignedBatchIds = accessContext.assignedBatchIds || [];

        if (assignedBatchIds.length === 0) {
            return {
                batches: [],
                courses: [],
                programs: [],
                levels: [],
                academicYears: []
            };
        }

        // 1. Fetch strictly assigned Batches
        const [batches] = await pool.query(
            `SELECT id, branch_id, level_id, academic_year_id, name, code, start_time, end_time, capacity, status
             FROM batches
             WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
             ORDER BY name ASC`,
            [tid, assignedBatchIds]
        );

        const levelIds = Array.from(new Set(batches.map(b => b.level_id).filter(Boolean)));
        const academicYearIds = Array.from(new Set(batches.map(b => b.academic_year_id).filter(Boolean)));

        // 2. Fetch Levels derived from assigned batches
        let levels = [];
        if (levelIds.length > 0) {
            const [levelRows] = await pool.query(
                `SELECT id, program_id, name, code, is_active
                 FROM levels
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, levelIds]
            );
            levels = levelRows;
        }

        const programIds = Array.from(new Set(levels.map(l => l.program_id).filter(Boolean)));

        // 3. Fetch Programs derived from levels
        let programs = [];
        if (programIds.length > 0) {
            const [progRows] = await pool.query(
                `SELECT id, course_id, name, code, is_active
                 FROM programs
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, programIds]
            );
            programs = progRows;
        }

        const courseIds = Array.from(new Set(programs.map(p => p.course_id).filter(Boolean)));

        // 4. Fetch Courses derived from programs
        let courses = [];
        if (courseIds.length > 0) {
            const [courseRows] = await pool.query(
                `SELECT id, name, code, is_active
                 FROM courses
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, courseIds]
            );
            courses = courseRows;
        }

        // 5. Fetch Academic Years derived from assigned batches
        let academicYears = [];
        if (academicYearIds.length > 0) {
            const [ayRows] = await pool.query(
                `SELECT id, name, start_date, end_date, status
                 FROM academic_years
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY start_date DESC`,
                [tid, academicYearIds]
            );
            academicYears = ayRows;
        }

        return {
            batches: batches.map(b => ({
                id: b.id,
                name: b.name,
                code: b.code,
                branchId: b.branch_id,
                levelId: b.level_id,
                academicYearId: b.academic_year_id
            })),
            courses: courses.map(c => ({ id: c.id, name: c.name, code: c.code })),
            programs: programs.map(p => ({ id: p.id, courseId: p.course_id, name: p.name, code: p.code })),
            levels: levels.map(l => ({ id: l.id, programId: l.program_id, name: l.name, code: l.code })),
            academicYears: academicYears.map(ay => ({ id: ay.id, name: ay.name }))
        };
    }

    /**
     * Get paginated student roster strictly scoped to the teacher's assigned batches.
     * Enforces database-level pagination, search, academic filters, and attendance summaries.
     * Financial / fee data is completely stripped.
     */
    async getStudents(tenantId, teacherUserId, filters = {}) {
        const tid = Number(tenantId);
        const accessContext = await studentAccessService.resolveTeacherAccessContext(tid, { userId: teacherUserId });
        const assignedBatchIds = accessContext.assignedBatchIds || [];

        if (assignedBatchIds.length === 0) {
            return {
                total: 0,
                data: []
            };
        }

        const {
            search = '',
            batchId,
            courseId,
            programId,
            levelId,
            academicYearId,
            status = '1',
            limit = 10,
            page = 1
        } = filters;

        // Security rule: If a specific batchId is requested, it MUST be in assignedBatchIds
        let targetBatchIds = assignedBatchIds;
        if (batchId && batchId !== 'All' && batchId !== '') {
            const requestedBatchId = Number(batchId);
            if (!assignedBatchIds.includes(requestedBatchId)) {
                // Requested batch is not assigned to teacher -> return empty result
                return {
                    total: 0,
                    data: []
                };
            }
            targetBatchIds = [requestedBatchId];
        }

        const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
        const numLimit = Math.max(1, Number(limit));

        let whereClause = `
            WHERE s.tenant_id = ?
              AND s.deleted_at IS NULL
              AND se.status = 'active'
              AND se.deleted_at IS NULL
              AND se.batch_id IN (?)
        `;
        const params = [tid, targetBatchIds];

        if (search && search.trim() !== '') {
            const term = `%${search.trim()}%`;
            whereClause += ` AND (s.full_name LIKE ? OR s.student_code LIKE ? OR s.mobile LIKE ? OR s.email LIKE ?)`;
            params.push(term, term, term, term);
        }

        if (levelId && levelId !== 'All' && levelId !== '') {
            whereClause += ` AND b.level_id = ?`;
            params.push(Number(levelId));
        }

        if (programId && programId !== 'All' && programId !== '') {
            whereClause += ` AND l.program_id = ?`;
            params.push(Number(programId));
        }

        if (courseId && courseId !== 'All' && courseId !== '') {
            whereClause += ` AND p.course_id = ?`;
            params.push(Number(courseId));
        }

        if (academicYearId && academicYearId !== 'All' && academicYearId !== '') {
            whereClause += ` AND se.academic_year_id = ?`;
            params.push(Number(academicYearId));
        }

        if (status !== undefined && status !== 'All' && status !== '') {
            const numStatus = (status === '1' || status === 'active' || Number(status) === 1) ? 1 : 0;
            whereClause += ` AND s.status = ?`;
            params.push(numStatus);
        }

        // 1. Database-level Count
        const countQuery = `
            SELECT COUNT(DISTINCT s.id) AS total
            FROM students s
            JOIN student_enrollments se ON se.student_id = s.id
            JOIN batches b ON se.batch_id = b.id AND b.deleted_at IS NULL
            LEFT JOIN levels l ON b.level_id = l.id AND l.deleted_at IS NULL
            LEFT JOIN programs p ON l.program_id = p.id AND p.deleted_at IS NULL
            ${whereClause}
        `;

        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0] ? Number(countRows[0].total) : 0;

        if (total === 0) {
            return {
                total: 0,
                data: []
            };
        }

        // 2. Database-level Paginated Roster Query
        const selectQuery = `
            SELECT 
                s.id,
                s.student_code,
                s.full_name,
                s.mobile,
                s.email,
                s.gender,
                s.dob,
                s.status,
                se.id AS enrollment_id,
                se.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                b.level_id,
                l.name AS level_name,
                l.code AS level_code,
                l.program_id,
                p.name AS program_name,
                p.code AS program_code,
                p.course_id,
                c.name AS course_name,
                c.code AS course_code,
                se.academic_year_id,
                ay.name AS academic_year_name,
                g.full_name AS guardian_name,
                g.mobile AS guardian_mobile,
                g.relation AS guardian_relation
            FROM students s
            JOIN student_enrollments se ON se.student_id = s.id
            JOIN batches b ON se.batch_id = b.id AND b.deleted_at IS NULL
            LEFT JOIN levels l ON b.level_id = l.id AND l.deleted_at IS NULL
            LEFT JOIN programs p ON l.program_id = p.id AND p.deleted_at IS NULL
            LEFT JOIN courses c ON p.course_id = c.id AND c.deleted_at IS NULL
            LEFT JOIN academic_years ay ON se.academic_year_id = ay.id AND ay.deleted_at IS NULL
            LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.tenant_id = s.tenant_id AND sg.is_primary = 1
            LEFT JOIN guardians g ON sg.guardian_id = g.id AND g.deleted_at IS NULL
            ${whereClause}
            ORDER BY s.id DESC
            LIMIT ? OFFSET ?
        `;

        const selectParams = [...params, numLimit, offset];
        const [rows] = await pool.query(selectQuery, selectParams);

        // 3. Enrich with live Attendance Totals
        const enriched = await this.enrichAttendance(tid, rows);

        // 4. Map to clean Teacher Student DTO
        const formatted = enriched.map(s => ({
            id: s.id,
            studentCode: s.student_code,
            fullName: s.full_name,
            mobile: s.mobile,
            email: s.email,
            gender: s.gender,
            dob: s.dob,
            status: Number(s.status) === 1 ? 'active' : 'inactive',
            enrollmentId: s.enrollment_id,
            batch: {
                id: s.batch_id,
                name: s.batch_name || '—',
                code: s.batch_code || ''
            },
            course: {
                id: s.course_id || null,
                name: s.course_name || '—',
                code: s.course_code || ''
            },
            program: {
                id: s.program_id || null,
                name: s.program_name || '—',
                code: s.program_code || ''
            },
            level: {
                id: s.level_id || null,
                name: s.level_name || '—',
                code: s.level_code || ''
            },
            academicYear: {
                id: s.academic_year_id || null,
                name: s.academic_year_name || '—'
            },
            guardian: {
                name: s.guardian_name || null,
                mobile: s.guardian_mobile || null,
                relation: s.guardian_relation || null
            },
            attendance: {
                total: s.attendance_total || 0,
                present: s.attendance_present || 0,
                late: s.attendance_late || 0,
                absent: Math.max(0, (s.attendance_total || 0) - (s.attendance_present || 0) - (s.attendance_late || 0)),
                pct: s.attendance_pct !== null && s.attendance_pct !== undefined ? Number(s.attendance_pct) : null
            },
            // Legacy / direct access properties for frontend components
            student_code: s.student_code,
            full_name: s.full_name,
            batch_id: s.batch_id,
            batch_name: s.batch_name,
            course_name: s.course_name,
            program_name: s.program_name,
            level_name: s.level_name,
            academic_year_name: s.academic_year_name,
            guardian_name: s.guardian_name,
            guardian_mobile: s.guardian_mobile,
            attendance_total: s.attendance_total || 0,
            attendance_present: s.attendance_present || 0,
            attendance_late: s.attendance_late || 0,
            attendance_pct: s.attendance_pct
        }));

        return {
            total,
            data: formatted
        };
    }

    /**
     * Get detailed teacher-scoped student profile plus attendance summary.
     * Enforces that the student belongs to at least one active batch assigned to this teacher.
     */
    async getStudentById(tenantId, teacherUserId, studentId) {
        const tid = Number(tenantId);
        const sid = Number(studentId);

        const accessContext = await studentAccessService.resolveTeacherAccessContext(tid, { userId: teacherUserId });
        const assignedBatchIds = accessContext.assignedBatchIds || [];

        if (assignedBatchIds.length === 0) {
            const err = new Error('Access denied. You do not have access to this student.');
            err.statusCode = 403;
            throw err;
        }

        const query = `
            SELECT 
                s.id,
                s.student_code,
                s.full_name,
                s.dob,
                s.gender,
                s.mobile,
                s.email,
                s.street,
                s.city,
                s.state,
                s.pincode,
                s.category,
                s.school_name,
                s.current_class,
                s.target_exam,
                s.blood_group,
                s.profile_photo_url,
                s.status,
                s.created_at,
                se.id AS enrollment_id,
                se.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                b.level_id,
                l.name AS level_name,
                l.code AS level_code,
                p.id AS program_id,
                p.name AS program_name,
                p.code AS program_code,
                c.id AS course_id,
                c.name AS course_name,
                c.code AS course_code,
                se.academic_year_id,
                ay.name AS academic_year_name,
                g.id AS guardian_id,
                g.full_name AS guardian_name,
                g.mobile AS guardian_mobile,
                g.relation AS guardian_relation,
                g.email AS guardian_email
            FROM students s
            JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            JOIN batches b ON se.batch_id = b.id AND b.deleted_at IS NULL
            LEFT JOIN levels l ON b.level_id = l.id AND l.deleted_at IS NULL
            LEFT JOIN programs p ON l.program_id = p.id AND p.deleted_at IS NULL
            LEFT JOIN courses c ON p.course_id = c.id AND c.deleted_at IS NULL
            LEFT JOIN academic_years ay ON se.academic_year_id = ay.id AND ay.deleted_at IS NULL
            LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.tenant_id = s.tenant_id AND sg.is_primary = 1
            LEFT JOIN guardians g ON sg.guardian_id = g.id AND g.deleted_at IS NULL
            WHERE s.tenant_id = ?
              AND s.id = ?
              AND se.batch_id IN (?)
              AND s.deleted_at IS NULL
            LIMIT 1
        `;

        const [rows] = await pool.query(query, [tid, sid, assignedBatchIds]);
        if (!rows.length) {
            const err = new Error('Student not found or not enrolled in any of your assigned batches.');
            err.statusCode = 404;
            throw err;
        }

        const student = rows[0];
        const attendance = await this.getAttendanceSummary(tid, sid);

        // Fetch detailed lecture attendance history logs for this student
        const [historyRows] = await pool.query(
            `SELECT
                l.id AS lecture_id,
                DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                l.start_time, l.end_time,
                s.name AS subject_name, s.code AS subject_code,
                b.name AS batch_name, b.code AS batch_code,
                ar.status AS attendance_status, ar.remarks,
                u.name AS teacher_name
             FROM attendance_records ar
             JOIN lectures l ON l.id = ar.lecture_id AND l.tenant_id = ar.tenant_id AND l.deleted_at IS NULL AND l.is_default = 0
             JOIN batches b ON l.batch_id = b.id
             JOIN subjects s ON l.subject_id = s.id
             LEFT JOIN users u ON l.teacher_user_id = u.id
             WHERE ar.tenant_id = ? AND ar.student_id = ?
             ORDER BY l.lecture_date DESC, l.start_time DESC`,
            [tid, sid]
        );

        return {
            id: student.id,
            studentCode: student.student_code,
            personal: {
                fullName: student.full_name,
                dob: student.dob,
                gender: student.gender,
                mobile: student.mobile,
                email: student.email,
                bloodGroup: student.blood_group,
                category: student.category,
                schoolName: student.school_name,
                currentClass: student.current_class,
                targetExam: student.target_exam,
                city: student.city,
                state: student.state,
                pincode: student.pincode,
                street: student.street,
                profilePhotoUrl: student.profile_photo_url
            },
            academic: {
                academicYear: student.academic_year_name || '—',
                course: student.course_name || '—',
                program: student.program_name || '—',
                level: student.level_name || '—',
                batch: student.batch_name || '—',
                batchId: student.batch_id,
                enrollmentId: student.enrollment_id
            },
            guardian: {
                name: student.guardian_name || '—',
                relation: student.guardian_relation || 'Parent/Guardian',
                mobile: student.guardian_mobile || '—',
                email: student.guardian_email || '—'
            },
            attendance,
            attendanceHistory: historyRows.map(h => ({
                lectureId: h.lecture_id,
                lectureDate: h.lecture_date,
                startTime: h.start_time,
                endTime: h.end_time,
                subjectName: h.subject_name,
                subjectCode: h.subject_code,
                batchName: h.batch_name,
                status: Number(h.attendance_status),
                remarks: h.remarks,
                teacherName: h.teacher_name
            })),
            status: Number(student.status) === 1 ? 'active' : 'inactive',
            // Legacy / direct mapping fields
            full_name: student.full_name,
            student_code: student.student_code,
            mobile: student.mobile,
            email: student.email,
            batch_name: student.batch_name,
            guardian_name: student.guardian_name,
            guardian_mobile: student.guardian_mobile,
            guardian_relation: student.guardian_relation
        };
    }

    /**
     * Enrich roster rows with aggregate attendance totals.
     */
    async enrichAttendance(tenantId, rows) {
        if (!Array.isArray(rows) || rows.length === 0) return rows;

        const ids = rows.map(r => Number(r.id)).filter(Boolean);
        const [attRows] = await pool.query(
            `SELECT ar.student_id,
                    COUNT(*) AS total,
                    SUM(ar.status = 1) AS present,
                    SUM(ar.status = 2) AS late,
                    ROUND(100 * (SUM(ar.status IN (1, 2)) / NULLIF(COUNT(*), 0)), 1) AS pct
             FROM attendance_records ar
             WHERE ar.tenant_id = ? AND ar.student_id IN (?)
             GROUP BY ar.student_id`,
            [tenantId, ids]
        );

        const attMap = new Map(attRows.map(r => [Number(r.student_id), r]));

        return rows.map(r => {
            const att = attMap.get(Number(r.id));
            const total = att ? Number(att.total || 0) : 0;
            return {
                ...r,
                attendance_total: total,
                attendance_present: att ? Number(att.present || 0) : 0,
                attendance_late: att ? Number(att.late || 0) : 0,
                attendance_pct: total > 0 && att ? Number(att.pct) : null
            };
        });
    }

    /**
     * Aggregate attendance summary for a single student.
     */
    async getAttendanceSummary(tenantId, studentId) {
        const [attRows] = await pool.query(
            `SELECT COUNT(*) AS total,
                    SUM(ar.status = 1) AS present,
                    SUM(ar.status = 2) AS late,
                    ROUND(100 * (SUM(ar.status IN (1, 2)) / NULLIF(COUNT(*), 0)), 1) AS pct
             FROM attendance_records ar
             WHERE ar.tenant_id = ? AND ar.student_id = ?`,
            [Number(tenantId), Number(studentId)]
        );

        const att = attRows[0];
        const total = att ? Number(att.total || 0) : 0;
        const present = att ? Number(att.present || 0) : 0;
        const late = att ? Number(att.late || 0) : 0;

        return {
            total,
            present,
            late,
            absent: Math.max(0, total - present - late),
            pct: total > 0 && att ? Number(att.pct) : null
        };
    }

    /**
     * Get all homeworks, assignments, exams and submission records for a specific student.
     * Enforces dual-factor teacher scoping (assigned batches AND assigned subjects).
     */
    async getStudentAssignments(tenantId, teacherUserId, studentId) {
        const tid = Number(tenantId);
        const sid = Number(studentId);

        const { batchIds: assignedBatchIds, subjectIds: assignedSubjectIds } = await teacherAcademicScopeService.getTeacherAllocations(tid, teacherUserId);

        if (assignedBatchIds.length === 0 || assignedSubjectIds.length === 0) {
            return [];
        }

        // Get student's active enrolled batches within teacher's assigned batches
        const [enrollmentRows] = await pool.query(
            `SELECT se.batch_id, b.name AS batch_name, b.code AS batch_code
             FROM student_enrollments se
             JOIN batches b ON se.batch_id = b.id AND b.deleted_at IS NULL
             WHERE se.tenant_id = ? AND se.student_id = ? AND se.status = 'active' AND se.deleted_at IS NULL AND se.batch_id IN (?)`,
            [tid, sid, assignedBatchIds]
        );

        if (!enrollmentRows.length) {
            const err = new Error('Student not found or not enrolled in any of your assigned batches.');
            err.statusCode = 404;
            throw err;
        }

        const studentBatchIds = enrollmentRows.map(e => Number(e.batch_id));
        const batchNameMap = Object.fromEntries(enrollmentRows.map(e => [Number(e.batch_id), e.batch_name]));

        // Fetch published/closed homeworks for the student's tenant scoped strictly to teacher's assigned subjects
        const [hwRows] = await pool.query(
            `SELECT 
                h.id, h.title, h.description, h.assignment_type,
                h.batch_ids, h.files, h.due_date, h.max_marks,
                h.status, h.published_at, h.closed_at, h.created_at,
                s.name AS subject_name, s.code AS subject_code
             FROM homeworks h
             JOIN subjects s ON h.subject_id = s.id
             WHERE h.tenant_id = ? 
               AND h.deleted_at IS NULL 
               AND (h.status IN (1, 2, 'published', 'closed', '1', '2'))
               AND h.subject_id IN (?)
             ORDER BY h.due_date DESC, h.id DESC`,
            [tid, assignedSubjectIds]
        );

        // Filter homeworks where target batch_ids intersects studentBatchIds
        const matchedHws = hwRows.filter(hw => {
            let bIds = [];
            if (Array.isArray(hw.batch_ids)) bIds = hw.batch_ids.map(Number);
            else if (typeof hw.batch_ids === 'string') {
                try {
                    const parsed = JSON.parse(hw.batch_ids);
                    bIds = Array.isArray(parsed) ? parsed.map(Number) : [];
                } catch {
                    bIds = [];
                }
            }
            return bIds.some(id => studentBatchIds.includes(id));
        });

        if (!matchedHws.length) {
            return [];
        }

        const hwIds = matchedHws.map(h => Number(h.id));

        // Fetch submissions for this student across these homeworks
        const [subRows] = await pool.query(
            `SELECT id AS submission_id, homework_id, response_text, files, status,
                    marks_obtained, teacher_feedback, submitted_at, graded_at
             FROM homework_submissions
             WHERE tenant_id = ? AND student_id = ? AND homework_id IN (?) AND deleted_at IS NULL`,
            [tid, sid, hwIds]
        );

        const subMap = new Map(subRows.map(s => [Number(s.homework_id), s]));

        const parseFiles = (files) => {
            if (Array.isArray(files)) return files;
            if (typeof files === 'string') {
                try {
                    const parsed = JSON.parse(files);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            return [];
        };

        return matchedHws.map(hw => {
            const sub = subMap.get(Number(hw.id));
            const isLate = Boolean(hw.due_date && sub?.submitted_at && new Date(sub.submitted_at) > new Date(hw.due_date));
            const isOverdue = Boolean(!sub && hw.due_date && new Date() > new Date(hw.due_date));

            let bIds = [];
            if (Array.isArray(hw.batch_ids)) bIds = hw.batch_ids.map(Number);
            else if (typeof hw.batch_ids === 'string') {
                try {
                    const parsed = JSON.parse(hw.batch_ids);
                    bIds = Array.isArray(parsed) ? parsed.map(Number) : [];
                } catch {
                    bIds = [];
                }
            }
            const matchingBatchNames = bIds.filter(id => batchNameMap[id]).map(id => batchNameMap[id]);

            return {
                id: String(hw.id),
                title: hw.title,
                description: hw.description || '',
                assignmentType: hw.assignment_type || 'assignment',
                subjectName: hw.subject_name || '—',
                subjectCode: hw.subject_code || '',
                batchName: matchingBatchNames.join(', ') || 'Enrolled Batch',
                dueDate: hw.due_date ? new Date(hw.due_date).toISOString().slice(0, 10) : '',
                dueDateTime: hw.due_date ? String(hw.due_date).replace(' ', 'T') : '',
                maxMarks: hw.max_marks !== null && hw.max_marks !== undefined ? Number(hw.max_marks) : null,
                status: hw.status,
                files: parseFiles(hw.files),
                isOverdue,
                submission: sub ? {
                    submissionId: String(sub.submission_id),
                    status: sub.status === 'graded' ? 'Graded' : 'Submitted',
                    responseText: sub.response_text || '',
                    files: parseFiles(sub.files),
                    marksObtained: sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Number(sub.marks_obtained) : null,
                    teacherFeedback: sub.teacher_feedback || '',
                    submittedAt: sub.submitted_at ? new Date(sub.submitted_at).toISOString() : null,
                    gradedAt: sub.graded_at ? new Date(sub.graded_at).toISOString() : null,
                    isLate
                } : null
            };
        });
    }
}

module.exports = new TeacherStudentService();