const pool = require('../config/db');

/**
 * Teacher Schedule Service
 * Implements business logic for the Teacher Academic Schedule module.
 * Strictly reuses existing tables (lectures, batches, teacher_allocations, classrooms, subjects, etc.)
 */
class TeacherScheduleService {
    /**
     * Get filter options scoped strictly to the teacher's assigned academic contexts.
     */
    async getTeacherOptions(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        // 1. Get teacher's assigned batches from teacher_allocations
        const [allocRows] = await pool.query(
            `SELECT DISTINCT ta.batch_id, ta.branch_id, ta.academic_year_id
             FROM teacher_allocations ta
             WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL`,
            [tid, uid]
        );

        // Also check if teacher has any scheduled lectures in batches even if allocation row wasn't created
        const [lectureBatchRows] = await pool.query(
            `SELECT DISTINCT l.batch_id, l.branch_id, l.academic_year_id
             FROM lectures l
             WHERE l.tenant_id = ? AND l.teacher_user_id = ? AND l.deleted_at IS NULL`,
            [tid, uid]
        );

        const assignedBatchIds = Array.from(new Set([
            ...allocRows.map(r => r.batch_id),
            ...lectureBatchRows.map(r => r.batch_id)
        ].filter(Boolean)));

        const assignedBranchIds = Array.from(new Set([
            ...allocRows.map(r => r.branch_id),
            ...lectureBatchRows.map(r => r.branch_id)
        ].filter(Boolean)));

        // If no explicit batches found, fallback to teacher profile branch
        if (assignedBranchIds.length === 0) {
            const [staffRows] = await pool.query(
                `SELECT branch_ids FROM staff_profiles WHERE tenant_id = ? AND user_id = ?`,
                [tid, uid]
            );
            if (staffRows.length > 0 && staffRows[0].branch_ids) {
                try {
                    const parsed = typeof staffRows[0].branch_ids === 'string'
                        ? JSON.parse(staffRows[0].branch_ids)
                        : staffRows[0].branch_ids;
                    if (Array.isArray(parsed)) assignedBranchIds.push(...parsed.map(Number));
                } catch {
                    // ignore JSON parse error
                }
            }
        }

        // 2. Fetch Branches
        let branchesQuery = `SELECT id, name, code, status FROM branches WHERE tenant_id = ? AND deleted_at IS NULL`;
        const branchesParams = [tid];
        if (assignedBranchIds.length > 0) {
            branchesQuery += ` AND id IN (?)`;
            branchesParams.push(assignedBranchIds);
        }
        const [branches] = await pool.query(branchesQuery, branchesParams);

        // 3. Fetch Academic Years
        const [academicYears] = await pool.query(
            `SELECT id, name, start_date, end_date, status 
             FROM academic_years 
             WHERE tenant_id = ? AND deleted_at IS NULL 
             ORDER BY start_date DESC`,
            [tid]
        );

        // 4. Fetch Batches
        let batches = [];
        if (assignedBatchIds.length > 0) {
            const [batchRows] = await pool.query(
                `SELECT id, branch_id, level_id, academic_year_id, name, code, start_time, end_time, classroom_id, capacity, status
                 FROM batches
                 WHERE tenant_id = ? AND id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, assignedBatchIds]
            );
            batches = batchRows;
        }

        const levelIds = Array.from(new Set(batches.map(b => b.level_id).filter(Boolean)));

        // 5. Fetch Levels derived from batches
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

        // 6. Fetch Programs derived from levels
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

        // 7. Fetch Courses derived from programs
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

        // 8. Fetch Subjects taught by this teacher
        const [teacherSubRows] = await pool.query(
            `SELECT s.id, s.name, s.code, s.type
             FROM teacher_subjects ts
             JOIN subjects s ON ts.subject_id = s.id
             WHERE ts.tenant_id = ? AND ts.teacher_user_id = ? AND s.deleted_at IS NULL`,
            [tid, uid]
        );

        const [classrooms] = await pool.query(
            `SELECT id, branch_id, name, room_number, capacity FROM classrooms WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tid]
        );

        const [teachers] = await pool.query(
            `SELECT u.id, u.name, u.email FROM users u 
             LEFT JOIN staff_profiles sp ON u.id = sp.user_id 
             WHERE u.tenant_id = ? AND u.deleted_at IS NULL AND (sp.employee_type = 'Teaching' OR u.user_type = 'teacher') 
             ORDER BY u.name ASC`,
            [tid]
        );

        return {
            branches,
            academicYears,
            courses,
            programs,
            levels,
            batches,
            subjects,
            classrooms,
            teachers
        };
    }

    /**
     * TODAY API: Returns all lectures assigned to the teacher for a single date across all batches.
     */
    async getTodaySchedule(tenantId, teacherUserId, targetDate, filters = {}) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const dateStr = targetDate || new Date().toISOString().split('T')[0];

        let query = `
            SELECT 
                l.id,
                l.tenant_id,
                l.branch_id,
                br.name AS branch_name,
                br.code AS branch_code,
                l.academic_year_id,
                ay.name AS academic_year_name,
                l.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                b.level_id,
                lvl.name AS level_name,
                p.id AS program_id,
                p.name AS program_name,
                c.id AS course_id,
                c.name AS course_name,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                l.teacher_user_id,
                u.name AS teacher_name,
                l.classroom_id,
                cr.name AS room_name,
                cr.room_number,
                DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                TIME_FORMAT(l.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(l.end_time, '%H:%i') AS end_time,
                l.topic,
                l.lecture_type,
                l.activity_type,
                l.slot_label,
                l.status,
                l.cancellation_reason,
                l.is_modified_from_default,
                l.attendance_taken,
                l.attendance_submitted_at,
                l.attendance_locked_at
            FROM lectures l
            LEFT JOIN branches br ON l.branch_id = br.id
            LEFT JOIN academic_years ay ON l.academic_year_id = ay.id
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN levels lvl ON b.level_id = lvl.id
            LEFT JOIN programs p ON lvl.program_id = p.id
            LEFT JOIN courses c ON p.course_id = c.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            LEFT JOIN classrooms cr ON l.classroom_id = cr.id
            WHERE l.tenant_id = ?
              AND l.teacher_user_id = ?
              AND l.lecture_date = ?
              AND l.deleted_at IS NULL
              AND l.status != 'CANCELLED'
        `;

        const params = [tid, uid, dateStr];

        if (filters.batchId) {
            query += ` AND l.batch_id = ?`;
            params.push(Number(filters.batchId));
        }
        if (filters.branchId) {
            query += ` AND l.branch_id = ?`;
            params.push(Number(filters.branchId));
        }

        query += ` ORDER BY l.start_time ASC`;

        const [rows] = await pool.query(query, params);

        // Map lectures into clean UI structure
        const lectures = rows.map(r => {
            const rawType = (r.activity_type || r.lecture_type || 'LECTURE').toUpperCase();
            let cardType = 'LECTURE';
            if (rawType.includes('LAB') || rawType.includes('PRACTICAL')) cardType = 'LAB';
            else if (rawType.includes('BREAK') || rawType.includes('LUNCH')) cardType = 'BREAK';
            else if (rawType.includes('PROXY') || rawType.includes('SUB')) cardType = 'SUBSTITUTION';
            else if (rawType.includes('ACTIVITY') || rawType.includes('EVENT')) cardType = 'ACTIVITY';

            return {
                id: r.id,
                startTime: r.start_time,
                endTime: r.end_time,
                type: cardType,
                lectureType: r.lecture_type || 'REGULAR',
                activityType: r.activity_type || 'THEORY',
                slotLabel: r.slot_label,
                subject: {
                    id: r.subject_id,
                    name: r.subject_name || 'Subject',
                    code: r.subject_code
                },
                topic: r.topic || '',
                batch: {
                    id: r.batch_id,
                    name: r.batch_name || `Batch #${r.batch_id}`,
                    code: r.batch_code
                },
                level: {
                    id: r.level_id,
                    name: r.level_name || 'Class'
                },
                program: {
                    id: r.program_id,
                    name: r.program_name
                },
                course: {
                    id: r.course_id,
                    name: r.course_name
                },
                classroom: {
                    id: r.classroom_id,
                    name: r.room_name || `Room ${r.room_number || ''}`,
                    roomNumber: r.room_number
                },
                branch: {
                    id: r.branch_id,
                    name: r.branch_name || '',
                    code: r.branch_code
                },
                status: r.status || 'SCHEDULED',
                attendance: {
                    required: true,
                    taken: Boolean(r.attendance_taken || r.attendance_submitted_at),
                    submittedAt: r.attendance_submitted_at,
                    lockedAt: r.attendance_locked_at
                },
                lessonPlan: {
                    available: true,
                    lessonPlanId: null
                }
            };
        });

        // Format day name
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        return {
            date: dateStr,
            day: dayName,
            totalLectures: lectures.length,
            lectures
        };
    }

    /**
     * WEEK API: Returns weekly scheduled lectures strictly for batches the teacher is assigned to.
     */
    async getWeekSchedule(tenantId, teacherUserId, startDate, endDate, filters = {}) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        // 1. Get teacher's assigned batches
        const [allocRows] = await pool.query(
            `SELECT DISTINCT batch_id FROM teacher_allocations 
             WHERE tenant_id = ? AND teacher_user_id = ? AND deleted_at IS NULL`,
            [tid, uid]
        );
        const assignedBatchIds = allocRows.map(r => r.batch_id).filter(Boolean);

        let query = `
            SELECT 
                l.id,
                l.tenant_id,
                l.branch_id,
                br.name AS branch_name,
                br.code AS branch_code,
                l.academic_year_id,
                l.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                b.level_id,
                lvl.name AS level_name,
                p.id AS program_id,
                p.name AS program_name,
                c.id AS course_id,
                c.name AS course_name,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                l.teacher_user_id,
                u.name AS teacher_name,
                l.classroom_id,
                cr.name AS room_name,
                cr.room_number,
                DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                TIME_FORMAT(l.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(l.end_time, '%H:%i') AS end_time,
                l.topic,
                l.lecture_type,
                l.activity_type,
                l.slot_label,
                l.status,
                l.attendance_taken
            FROM lectures l
            LEFT JOIN branches br ON l.branch_id = br.id
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN levels lvl ON b.level_id = lvl.id
            LEFT JOIN programs p ON lvl.program_id = p.id
            LEFT JOIN courses c ON p.course_id = c.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            LEFT JOIN classrooms cr ON l.classroom_id = cr.id
            WHERE l.tenant_id = ?
              AND l.teacher_user_id = ?
              AND l.lecture_date >= ?
              AND l.lecture_date <= ?
              AND l.deleted_at IS NULL
              AND l.status != 'CANCELLED'
        `;

        const params = [tid, uid, startDate, endDate];

        // If teacher has assigned batches and filter is not set to another batch, scope to assigned batches or direct teacher lectures
        if (assignedBatchIds.length > 0 && !filters.batchId) {
            query += ` AND (l.batch_id IN (?) OR l.teacher_user_id = ?)`;
            params.push(assignedBatchIds, uid);
        }

        if (filters.batchId && filters.batchId !== 'All') {
            query += ` AND l.batch_id = ?`;
            params.push(Number(filters.batchId));
        }
        if (filters.branchId && filters.branchId !== 'All') {
            query += ` AND l.branch_id = ?`;
            params.push(Number(filters.branchId));
        }
        if (filters.courseId && filters.courseId !== 'All') {
            query += ` AND c.name = ?`;
            params.push(filters.courseId);
        }
        if (filters.levelId && filters.levelId !== 'All') {
            query += ` AND lvl.name = ?`;
            params.push(filters.levelId);
        }

        query += ` ORDER BY l.lecture_date ASC, l.start_time ASC`;

        const [rows] = await pool.query(query, params);

        const lectures = rows.map(r => {
            const rawType = (r.activity_type || r.lecture_type || 'LECTURE').toUpperCase();
            let cardType = 'LECTURE';
            if (rawType.includes('LAB') || rawType.includes('PRACTICAL')) cardType = 'LAB';
            else if (rawType.includes('BREAK') || rawType.includes('LUNCH')) cardType = 'BREAK';
            else if (rawType.includes('PROXY') || rawType.includes('SUB')) cardType = 'SUBSTITUTION';
            else if (rawType.includes('ACTIVITY') || rawType.includes('EVENT')) cardType = 'ACTIVITY';

            const d = new Date(r.lecture_date);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

            return {
                id: r.id,
                date: r.lecture_date,
                day: dayName,
                startTime: r.start_time,
                endTime: r.end_time,
                type: cardType,
                lectureType: r.lecture_type || 'REGULAR',
                activityType: r.activity_type || 'THEORY',
                slotLabel: r.slot_label,
                subject: {
                    id: r.subject_id,
                    name: r.subject_name || 'Subject',
                    code: r.subject_code
                },
                topic: r.topic || '',
                batch: {
                    id: r.batch_id,
                    name: r.batch_name || `Batch #${r.batch_id}`,
                    code: r.batch_code
                },
                level: {
                    id: r.level_id,
                    name: r.level_name || 'Class'
                },
                classroom: {
                    id: r.classroom_id,
                    name: r.room_name || `Room ${r.room_number || ''}`,
                    roomNumber: r.room_number
                },
                branch: {
                    id: r.branch_id,
                    name: r.branch_name || '',
                    code: r.branch_code
                },
                status: r.status || 'SCHEDULED',
                attendanceTaken: Boolean(r.attendance_taken)
            };
        });

        return {
            startDate,
            endDate,
            totalLectures: lectures.length,
            lectures
        };
    }

    /**
     * UPCOMING API: Returns future scheduled lectures for the teacher.
     */
    async getUpcomingSchedule(tenantId, teacherUserId, fromDate, days = 14, filters = {}) {
        const start = fromDate || new Date().toISOString().split('T')[0];
        const endD = new Date(start);
        endD.setDate(endD.getDate() + Number(days));
        const end = endD.toISOString().split('T')[0];

        return this.getWeekSchedule(tenantId, teacherUserId, start, end, filters);
    }

    /**
     * ACADEMIC EVENTS API
     */
    async getAcademicEvents(tenantId, branchId, academicYearId) {
        return [
            {
                id: 'EVT-101',
                title: 'Term 1 Mid-Term Assessment Week',
                type: 'EXAM',
                startDate: '2026-09-21',
                endDate: '2026-09-26',
                description: 'Mid-term practicals and theory evaluations for Foundation & Senior Batches.',
                venue: 'All Branches'
            },
            {
                id: 'EVT-102',
                title: 'Gandhi Jayanti (Holiday)',
                type: 'HOLIDAY',
                startDate: '2026-10-02',
                endDate: '2026-10-02',
                description: 'National holiday. No lectures scheduled.',
                venue: 'All Branches'
            },
            {
                id: 'EVT-103',
                title: 'Parent-Teacher Interaction Meet (PTM)',
                type: 'MEETING',
                startDate: '2026-10-10',
                endDate: '2026-10-10',
                description: 'Bi-monthly academic review with guardians and faculty members.',
                venue: 'Main Auditorium / Online'
            }
        ];
    }

    /**
     * CHANGES API: Get schedule change / proxy requests.
     */
    async getScheduleChanges(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [requestRows] = await pool.query(
            `SELECT lr.id, lr.lecture_id, lr.request_type, lr.batch_id, b.name AS batch_name,
                    lr.subject_id, s.name AS subject_name,
                    DATE_FORMAT(COALESCE(lr.requested_date, lr.\`current_date\`), '%Y-%m-%d') AS \`date\`,
                    TIME_FORMAT(COALESCE(lr.requested_start_time, lr.current_start_time), '%H:%i') AS start_time,
                    TIME_FORMAT(COALESCE(lr.requested_end_time, lr.current_end_time), '%H:%i') AS end_time,
                    lr.status, lr.reason, lr.updated_at
             FROM lecture_requests lr
             LEFT JOIN batches b ON lr.batch_id = b.id
             LEFT JOIN subjects s ON lr.subject_id = s.id
             WHERE lr.tenant_id = ? AND (lr.requester_id = ? OR lr.current_teacher_user_id = ?)
             ORDER BY lr.created_at DESC LIMIT 30`,
            [tid, uid, uid]
        );

        return requestRows.map(r => ({
            id: `REQ-${r.id}`,
            lectureId: r.lecture_id || 0,
            type: r.request_type,
            batchId: r.batch_id,
            batchName: r.batch_name || 'Batch',
            subject: r.subject_name || 'Subject',
            date: r.date || '',
            time: r.start_time && r.end_time ? `${r.start_time} - ${r.end_time}` : '',
            status: r.status === 'approved' || r.status === 'applied' ? 'Approved' : (r.status === 'rejected' ? 'Rejected' : 'Pending Approval'),
            reason: r.reason || '',
            updatedAt: r.updated_at
        }));
    }
}

module.exports = new TeacherScheduleService();
