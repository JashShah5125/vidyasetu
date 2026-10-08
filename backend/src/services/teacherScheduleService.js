const pool = require('../config/db');
const academicEventModel = require('../models/academicEventModel');

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

        // 1. Get teacher's assigned batches from teacher_allocations and scheduled lectures
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

        const assignedBatchIds = Array.from(new Set(
            allocRows.map(r => r.batch_id).filter(Boolean)
        ));

        const assignedBranchIds = Array.from(new Set(
            allocRows.map(r => r.branch_id).filter(Boolean)
        ));

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
        } else if (assignedBranchIds.length > 0) {
            const [branchBatches] = await pool.query(
                `SELECT id, branch_id, level_id, academic_year_id, name, code, start_time, end_time, classroom_id, capacity, status
                 FROM batches
                 WHERE tenant_id = ? AND branch_id IN (?) AND deleted_at IS NULL
                 ORDER BY name ASC`,
                [tid, assignedBranchIds]
            );
            batches = branchBatches;
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
        const [subjects] = await pool.query(
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
                l.attendance_locked_at,
                sa.status AS staff_attendance_status,
                sa.lecture_ids AS staff_attendance_lecture_ids
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
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.tenant_id = l.tenant_id AND sp.deleted_at IS NULL
            LEFT JOIN staff_attendance sa ON sa.staff_id = sp.id AND sa.date = l.lecture_date
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

            const lectureId = Number(r.id);
            let staffLectureIds = [];
            if (r.staff_attendance_lecture_ids) {
                try {
                    staffLectureIds = typeof r.staff_attendance_lecture_ids === 'string'
                        ? JSON.parse(r.staff_attendance_lecture_ids)
                        : r.staff_attendance_lecture_ids;
                } catch (_) {
                    staffLectureIds = [];
                }
            }

            const lectureAttendanceTaken = Boolean(r.attendance_taken || r.attendance_submitted_at);
            let isTeacherPresent = false;
            if (r.staff_attendance_status === 0) {
                isTeacherPresent = false;
            } else if (Array.isArray(staffLectureIds) && staffLectureIds.length > 0) {
                isTeacherPresent = staffLectureIds.includes(lectureId) || lectureAttendanceTaken;
            } else if (r.staff_attendance_status === 1) {
                isTeacherPresent = true;
            } else {
                isTeacherPresent = lectureAttendanceTaken;
            }

            return {
                id: r.id,
                date: r.lecture_date,
                lectureDate: r.lecture_date,
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
                    taken: lectureAttendanceTaken,
                    submittedAt: r.attendance_submitted_at,
                    lockedAt: r.attendance_locked_at
                },
                lessonPlan: {
                    available: true,
                    lessonPlanId: null
                },
                attendanceTaken: lectureAttendanceTaken,
                isTeacherPresent: Boolean(isTeacherPresent),
                teacherAttendanceStatus: isTeacherPresent ? 'PRESENT' : (r.staff_attendance_status === 0 ? 'ABSENT' : 'NOT_MARKED')
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
                l.attendance_taken,
                l.attendance_submitted_at,
                l.attendance_locked_at,
                sa.status AS staff_attendance_status,
                sa.lecture_ids AS staff_attendance_lecture_ids
            FROM lectures l
            LEFT JOIN branches br ON l.branch_id = br.id
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN levels lvl ON b.level_id = lvl.id
            LEFT JOIN programs p ON lvl.program_id = p.id
            LEFT JOIN courses c ON p.course_id = c.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            LEFT JOIN classrooms cr ON l.classroom_id = cr.id
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.tenant_id = l.tenant_id AND sp.deleted_at IS NULL
            LEFT JOIN staff_attendance sa ON sa.staff_id = sp.id AND sa.date = l.lecture_date
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

            const lectureId = Number(r.id);
            let staffLectureIds = [];
            if (r.staff_attendance_lecture_ids) {
                try {
                    staffLectureIds = typeof r.staff_attendance_lecture_ids === 'string'
                        ? JSON.parse(r.staff_attendance_lecture_ids)
                        : r.staff_attendance_lecture_ids;
                } catch (_) {
                    staffLectureIds = [];
                }
            }

            const lectureAttendanceTaken = Boolean(r.attendance_taken || r.attendance_submitted_at);
            let isTeacherPresent = false;
            if (r.staff_attendance_status === 0) {
                isTeacherPresent = false;
            } else if (Array.isArray(staffLectureIds) && staffLectureIds.length > 0) {
                isTeacherPresent = staffLectureIds.includes(lectureId) || lectureAttendanceTaken;
            } else if (r.staff_attendance_status === 1) {
                isTeacherPresent = true;
            } else {
                isTeacherPresent = lectureAttendanceTaken;
            }

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
                attendance: {
                    required: true,
                    taken: lectureAttendanceTaken,
                    submittedAt: r.attendance_submitted_at,
                    lockedAt: r.attendance_locked_at
                },
                attendanceTaken: lectureAttendanceTaken,
                isTeacherPresent: Boolean(isTeacherPresent),
                teacherAttendanceStatus: isTeacherPresent ? 'PRESENT' : (r.staff_attendance_status === 0 ? 'ABSENT' : 'NOT_MARKED')
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
        const events = await academicEventModel.getEvents(tenantId, {
            branchId,
            academicYearId
        });
        return events;
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

    /**
     * HISTORICAL ATTENDANCE: Full history of past lectures for teacher with attendance metrics
     */
    async getHistory(tenantId, teacherUserId, filters = {}) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        let query = `
            SELECT 
                l.id,
                l.tenant_id,
                l.branch_id,
                br.name AS branch_name,
                br.code AS branch_code,
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
                l.attendance_taken,
                l.attendance_submitted_at,
                COUNT(DISTINCT se.student_id) AS total_enrolled,
                COUNT(DISTINCT ar.student_id) AS total_marked,
                COUNT(DISTINCT CASE WHEN ar.status = 1 THEN ar.student_id END) AS present_count,
                COUNT(DISTINCT CASE WHEN ar.status = 2 THEN ar.student_id END) AS late_count,
                COUNT(DISTINCT CASE WHEN ar.status = 0 THEN ar.student_id END) AS absent_count
            FROM lectures l
            LEFT JOIN branches br ON l.branch_id = br.id
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN levels lvl ON b.level_id = lvl.id
            LEFT JOIN programs p ON lvl.program_id = p.id
            LEFT JOIN courses c ON p.course_id = c.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            LEFT JOIN classrooms cr ON l.classroom_id = cr.id
            LEFT JOIN student_enrollments se ON se.batch_id = l.batch_id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN attendance_records ar ON ar.lecture_id = l.id
            WHERE l.tenant_id = ?
              AND l.teacher_user_id = ?
              AND l.deleted_at IS NULL
              AND l.status != 'CANCELLED'
              AND l.lecture_date IS NOT NULL
        `;
        const params = [tid, uid];

        if (filters.batchId && filters.batchId !== 'all' && filters.batchId !== 'All') {
            query += ` AND l.batch_id = ?`;
            params.push(Number(filters.batchId));
        }

        if (filters.startDate) {
            query += ` AND l.lecture_date >= ?`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ` AND l.lecture_date <= ?`;
            params.push(filters.endDate);
        }

        if (filters.status === 'submitted') {
            query += ` AND (l.attendance_taken = 1 OR l.attendance_submitted_at IS NOT NULL)`;
        } else if (filters.status === 'pending') {
            query += ` AND (l.attendance_taken = 0 AND l.attendance_submitted_at IS NULL)`;
        }

        query += ` GROUP BY l.id ORDER BY l.lecture_date DESC, l.start_time DESC LIMIT 200`;

        const [rows] = await pool.query(query, params);

        const lectures = rows.map(r => {
            const enrolled = Number(r.total_enrolled) || 0;
            const marked = Number(r.total_marked) || 0;
            const present = Number(r.present_count) || 0;
            const late = Number(r.late_count) || 0;
            const absent = Number(r.absent_count) || 0;
            const isSubmitted = Boolean(r.attendance_taken || r.attendance_submitted_at);
            const effectiveDenom = enrolled > 0 ? enrolled : marked;
            const turnoutRate = effectiveDenom > 0 ? Math.round(((present + late) / effectiveDenom) * 100) : 0;

            return {
                id: r.id,
                date: r.lecture_date || '',
                lectureDate: r.lecture_date || '',
                startTime: r.start_time || '',
                endTime: r.end_time || '',
                batch: {
                    id: r.batch_id,
                    name: r.batch_name || `Batch #${r.batch_id}`,
                    code: r.batch_code
                },
                level: {
                    id: r.level_id,
                    name: r.level_name || 'Class'
                },
                subject: {
                    id: r.subject_id,
                    name: r.subject_name || 'Subject',
                    code: r.subject_code
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
                topic: r.topic || '',
                status: r.status,
                attendanceTaken: isSubmitted,
                attendance: {
                    taken: isSubmitted,
                    submittedAt: r.attendance_submitted_at
                },
                totalEnrolled: enrolled,
                totalMarked: marked,
                presentCount: present,
                lateCount: late,
                absentCount: absent,
                turnoutRate
            };
        });

        // Summary KPI
        const totalLectures = lectures.length;
        const submittedLectures = lectures.filter(l => l.attendanceTaken).length;
        const pendingLectures = totalLectures - submittedLectures;
        const submittedList = lectures.filter(l => l.attendanceTaken && (l.totalEnrolled > 0 || l.totalMarked > 0));
        const avgTurnout = submittedList.length > 0 
            ? Math.round(submittedList.reduce((acc, l) => acc + l.turnoutRate, 0) / submittedList.length)
            : 0;
        const totalPresentStudents = lectures.reduce((acc, l) => acc + l.presentCount, 0);

        return {
            totalLectures,
            submittedLectures,
            pendingLectures,
            avgTurnout,
            totalPresentStudents,
            lectures
        };
    }

    /**
     * BATCH TURNOUT SUMMARY: Aggregate attendance turnouts by batch
     */
    async getBatchTurnoutSummary(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [rows] = await pool.query(
            `SELECT 
                b.id AS batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                COUNT(DISTINCT l.id) AS total_lectures,
                COUNT(DISTINCT CASE WHEN l.attendance_taken = 1 OR l.attendance_submitted_at IS NOT NULL THEN l.id END) AS conducted_lectures,
                COUNT(DISTINCT se.student_id) AS enrolled_students,
                COUNT(DISTINCT CASE WHEN ar.status = 1 THEN ar.id END) AS total_present_marks,
                COUNT(DISTINCT CASE WHEN ar.status = 2 THEN ar.id END) AS total_late_marks,
                COUNT(DISTINCT CASE WHEN ar.status = 0 THEN ar.id END) AS total_absent_marks
             FROM lectures l
             JOIN batches b ON l.batch_id = b.id
             LEFT JOIN student_enrollments se ON se.batch_id = b.id AND se.status = 'active' AND se.deleted_at IS NULL
             LEFT JOIN attendance_records ar ON ar.lecture_id = l.id
             WHERE l.tenant_id = ?
               AND l.teacher_user_id = ?
               AND l.deleted_at IS NULL
               AND l.status != 'CANCELLED'
             GROUP BY b.id, b.name, b.code
             ORDER BY b.name ASC`,
            [tid, uid]
        );

        return rows.map(r => {
            const totalMarks = Number(r.total_present_marks) + Number(r.total_late_marks) + Number(r.total_absent_marks);
            const presentTotal = Number(r.total_present_marks) + Number(r.total_late_marks);
            const turnoutRate = totalMarks > 0 ? Math.round((presentTotal / totalMarks) * 100) : 0;

            return {
                batchId: r.batch_id,
                batchName: r.batch_name,
                batchCode: r.batch_code,
                totalLectures: Number(r.total_lectures) || 0,
                conductedLectures: Number(r.conducted_lectures) || 0,
                enrolledStudents: Number(r.enrolled_students) || 0,
                turnoutRate
            };
        });
    }

    /**
     * LOW ATTENDANCE ALERTS: Students in teacher's batches with attendance below threshold (default 75%)
     */
    async getLowAttendanceAlerts(tenantId, teacherUserId, threshold = 75) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [rows] = await pool.query(
            `SELECT 
                s.id AS student_id,
                s.full_name,
                s.student_code,
                s.mobile,
                b.id AS batch_id,
                b.name AS batch_name,
                COUNT(DISTINCT l.id) AS total_lectures,
                COUNT(DISTINCT CASE WHEN ar.status IN (1, 2) THEN l.id END) AS attended_lectures,
                ROUND(100 * COUNT(DISTINCT CASE WHEN ar.status IN (1, 2) THEN l.id END) / NULLIF(COUNT(DISTINCT l.id), 0), 1) AS attendance_pct
             FROM student_enrollments se
             JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
             JOIN batches b ON se.batch_id = b.id
             JOIN lectures l ON l.batch_id = b.id AND l.tenant_id = ? AND l.teacher_user_id = ? AND (l.attendance_taken = 1 OR l.attendance_submitted_at IS NOT NULL) AND l.deleted_at IS NULL
             LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.student_id = s.id
             WHERE se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
             GROUP BY s.id, s.full_name, s.student_code, s.mobile, b.id, b.name
             HAVING total_lectures >= 1 AND attendance_pct < ?
             ORDER BY attendance_pct ASC`,
            [tid, uid, tid, Number(threshold)]
        );

        return rows.map(r => ({
            studentId: r.student_id,
            fullName: r.full_name,
            studentCode: r.student_code,
            mobile: r.mobile,
            batchId: r.batch_id,
            batchName: r.batch_name,
            totalLectures: Number(r.total_lectures) || 0,
            attendedLectures: Number(r.attended_lectures) || 0,
            attendancePct: Number(r.attendance_pct) || 0
        }));
    }

    /**
     * TEACHER AVAILABILITY: Get weekly standard schedule and specific date exceptions
     */
    async getTeacherAvailability(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [rows] = await pool.query(
            `SELECT id, branch_id, teacher_user_id, day_of_week,
                    DATE_FORMAT(specific_date, '%Y-%m-%d') AS specific_date,
                    TIME_FORMAT(start_time, '%H:%i') AS start_time,
                    TIME_FORMAT(end_time, '%H:%i') AS end_time,
                    is_available, reason, created_at
             FROM teacher_availability
             WHERE tenant_id = ? AND teacher_user_id = ? AND deleted_at IS NULL
             ORDER BY day_of_week ASC, start_time ASC`,
            [tid, uid]
        );

        const weeklyRows = rows.filter(r => !r.specific_date);
        // Filter out system leave-generated blocks so they don't duplicate formal Leave Requests in UI
        const exceptions = rows.filter(r => Boolean(r.specific_date) && (!r.reason || !r.reason.startsWith('[Leave:')));

        // Default 7 days template (Mon-Sat 09:00-17:00, Sun off) if no weekly rows saved yet
        const DAYS = [
            { dayOfWeek: 1, dayName: 'Monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 4, dayName: 'Thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 5, dayName: 'Friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 6, dayName: 'Saturday', isAvailable: true, startTime: '09:00', endTime: '14:00' },
            { dayOfWeek: 7, dayName: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
        ];

        const weekly = DAYS.map(d => {
            const existing = weeklyRows.find(w => Number(w.day_of_week) === d.dayOfWeek);
            if (existing) {
                return {
                    id: existing.id,
                    dayOfWeek: d.dayOfWeek,
                    dayName: d.dayName,
                    isAvailable: Boolean(existing.is_available),
                    startTime: existing.start_time || '09:00',
                    endTime: existing.end_time || '17:00'
                };
            }
            return d;
        });

        return {
            weekly,
            exceptions: exceptions.map(e => ({
                id: e.id,
                specificDate: e.specific_date,
                startTime: e.start_time,
                endTime: e.end_time,
                isAvailable: Boolean(e.is_available),
                reason: e.reason || 'Personal Leave',
                createdAt: e.created_at
            }))
        };
    }

    /**
     * TEACHER AVAILABILITY: Save/replace standard recurring weekly hours
     */
    async saveWeeklyAvailability(tenantId, teacherUserId, weeklySlots) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        // Delete existing weekly recurring slots (where specific_date IS NULL)
        await pool.query(
            `DELETE FROM teacher_availability
             WHERE tenant_id = ? AND teacher_user_id = ? AND specific_date IS NULL`,
            [tid, uid]
        );

        if (Array.isArray(weeklySlots) && weeklySlots.length > 0) {
            for (const slot of weeklySlots) {
                const dayOfWeek = Number(slot.dayOfWeek);
                const startTime = slot.startTime ? slot.startTime.slice(0, 5) : '09:00';
                const endTime = slot.endTime ? slot.endTime.slice(0, 5) : '17:00';
                const isAvailable = slot.isAvailable ? 1 : 0;

                await pool.query(
                    `INSERT INTO teacher_availability 
                     (tenant_id, teacher_user_id, day_of_week, start_time, end_time, is_available, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [tid, uid, dayOfWeek, startTime, endTime, isAvailable, uid]
                );
            }
        }

        return this.getTeacherAvailability(tid, uid);
    }

    /**
     * TEACHER AVAILABILITY: Add specific unavailable date block / exception
     */
    async addUnavailableDateException(tenantId, teacherUserId, payload) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const { specificDate, startTime = '00:00', endTime = '23:59', reason = 'Leave / Unavailable', branchId = null } = payload;

        if (!specificDate) {
            throw new Error('specificDate is required');
        }

        const dateObj = new Date(specificDate);
        // getDay: 0 is Sun, 1 is Mon... convert to 1=Mon..7=Sun
        const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();

        const sTime = startTime.length === 5 ? `${startTime}:00` : startTime;
        const eTime = endTime.length === 5 ? `${endTime}:00` : endTime;

        const [res] = await pool.query(
            `INSERT INTO teacher_availability
             (tenant_id, branch_id, teacher_user_id, day_of_week, specific_date, start_time, end_time, is_available, reason, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [tid, branchId ? Number(branchId) : null, uid, dayOfWeek, specificDate, sTime, eTime, reason, uid]
        );

        return {
            id: res.insertId,
            specificDate,
            startTime: sTime.slice(0, 5),
            endTime: eTime.slice(0, 5),
            isAvailable: false,
            reason
        };
    }

    /**
     * TEACHER AVAILABILITY: Delete availability slot / exception
     */
    async deleteAvailabilitySlot(tenantId, teacherUserId, slotId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        await pool.query(
            `DELETE FROM teacher_availability
             WHERE id = ? AND tenant_id = ? AND teacher_user_id = ?`,
            [Number(slotId), tid, uid]
        );

        return { success: true };
    }

    /**
     * TEACHER LEAVE REQUESTS: Get all leave requests for this teacher
     */
    async getTeacherLeaveRequests(tenantId, teacherUserId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [rows] = await pool.query(
            `SELECT lr.id, lr.tenant_id, lr.branch_id, lr.staff_id,
                    DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
                    DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
                    lr.leave_type, lr.reason, lr.status, lr.created_at,
                    b.name AS branch_name
             FROM leave_requests lr
             JOIN staff_profiles sp ON lr.staff_id = sp.id
             LEFT JOIN branches b ON lr.branch_id = b.id
             WHERE lr.tenant_id = ?
               AND sp.user_id = ?
               AND lr.deleted_at IS NULL
             ORDER BY lr.created_at DESC`,
            [tid, uid]
        );

        return rows.map(r => ({
            id: r.id,
            startDate: r.start_date,
            endDate: r.end_date,
            leaveType: r.leave_type,
            reason: r.reason,
            status: r.status,
            branchName: r.branch_name,
            createdAt: r.created_at
        }));
    }

    /**
     * TEACHER LEAVE REQUESTS: Submit a new leave request
     */
    async createTeacherLeaveRequest(tenantId, teacherUserId, payload) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);
        const { startDate, endDate, leaveType = 'Casual Leave', reason = 'Personal Leave', branchId } = payload;

        if (!startDate || !endDate) {
            throw new Error('startDate and endDate are required');
        }

        // 1. Resolve staff_id from staff_profiles for this user
        let [staffRows] = await pool.query(
            `SELECT id, branch_ids FROM staff_profiles WHERE tenant_id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
            [tid, uid]
        );

        let staffId;
        let resolvedBranchId = branchId ? Number(branchId) : null;

        if (staffRows.length > 0) {
            staffId = staffRows[0].id;
            if (!resolvedBranchId && staffRows[0].branch_ids) {
                try {
                    const parsedBranches = JSON.parse(staffRows[0].branch_ids);
                    if (Array.isArray(parsedBranches) && parsedBranches.length > 0) {
                        resolvedBranchId = Number(parsedBranches[0]);
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
        } else {
            // Auto-create staff_profile if absent so FK constraint succeeds
            const [userRows] = await pool.query(
                `SELECT id, name, email FROM users WHERE id = ? AND tenant_id = ?`,
                [uid, tid]
            );
            const userName = userRows[0]?.name || 'Teacher';
            const nameParts = userName.split(' ');
            const firstName = nameParts[0] || 'Teacher';
            const lastName = nameParts.slice(1).join(' ') || '';

            const [branchRows] = await pool.query(
                `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                [tid]
            );
            resolvedBranchId = resolvedBranchId || (branchRows[0]?.id ? Number(branchRows[0].id) : 1);

            const [newStaff] = await pool.query(
                `INSERT INTO staff_profiles (tenant_id, branch_ids, user_id, employee_id, first_name, last_name, employee_type, designation, employment_type, employment_status, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'Teaching', 'Faculty', 'full_time', 'active', 'active')`,
                [tid, JSON.stringify([resolvedBranchId]), uid, `EMP-${uid}`, firstName, lastName]
            );
            staffId = newStaff.insertId;
        }

        if (!resolvedBranchId) {
            const [branchRows] = await pool.query(
                `SELECT id FROM branches WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
                [tid]
            );
            resolvedBranchId = branchRows[0]?.id ? Number(branchRows[0].id) : 1;
        }

        // 2. Insert into leave_requests
        const [insertRes] = await pool.query(
            `INSERT INTO leave_requests (tenant_id, branch_id, staff_id, start_date, end_date, leave_type, reason, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [tid, resolvedBranchId, staffId, startDate, endDate, leaveType, reason, uid]
        );

        const leaveRequestId = insertRes.insertId;

        // 3. Automatically block the teacher's schedule in teacher_availability for the date range
        try {
            const [sy, sm, sd] = startDate.split('-').map(Number);
            const [ey, em, ed] = endDate.split('-').map(Number);
            const cur = new Date(sy, sm - 1, sd);
            const end = new Date(ey, em - 1, ed);

            while (cur <= end) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, '0');
                const d = String(cur.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                const dayOfWeek = cur.getDay() === 0 ? 7 : cur.getDay();

                await pool.query(
                    `INSERT INTO teacher_availability (tenant_id, branch_id, teacher_user_id, day_of_week, specific_date, start_time, end_time, is_available, reason, created_by)
                     VALUES (?, ?, ?, ?, ?, '00:00:00', '23:59:00', 0, ?, ?)
                     ON DUPLICATE KEY UPDATE is_available = 0, reason = VALUES(reason)`,
                    [tid, resolvedBranchId, uid, dayOfWeek, dateStr, `[Leave: ${leaveType}] ${reason}`, uid]
                ).catch(err => {
                    console.warn('[createTeacherLeaveRequest] Availability note:', err.message);
                });

                cur.setDate(cur.getDate() + 1);
            }
        } catch (dateErr) {
            console.error('[createTeacherLeaveRequest] Date loop error:', dateErr);
        }

        return {
            id: leaveRequestId,
            startDate,
            endDate,
            leaveType,
            reason,
            status: 'pending',
            createdAt: new Date()
        };
    }

    /**
     * TEACHER LEAVE REQUESTS: Cancel a leave request
     */
    async cancelTeacherLeaveRequest(tenantId, teacherUserId, leaveRequestId) {
        const tid = Number(tenantId);
        const uid = Number(teacherUserId);

        const [rows] = await pool.query(
            `SELECT lr.id,
                    DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
                    DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
                    lr.leave_type, lr.reason
             FROM leave_requests lr
             JOIN staff_profiles sp ON lr.staff_id = sp.id
             WHERE lr.id = ? AND lr.tenant_id = ? AND sp.user_id = ? AND lr.deleted_at IS NULL`,
            [Number(leaveRequestId), tid, uid]
        );

        if (rows.length === 0) {
            throw new Error('Leave request not found or unauthorized');
        }

        const leave = rows[0];

        await pool.query(
            `UPDATE leave_requests SET status = 'cancelled', deleted_at = NOW(), updated_by = ? WHERE id = ?`,
            [uid, Number(leaveRequestId)]
        );

        if (leave.start_date && leave.end_date) {
            await pool.query(
                `DELETE FROM teacher_availability
                 WHERE tenant_id = ?
                   AND teacher_user_id = ?
                   AND specific_date >= ?
                   AND specific_date <= ?
                   AND reason LIKE ?`,
                [tid, uid, leave.start_date, leave.end_date, `%[Leave:%`]
            ).catch(e => console.warn('[cancelTeacherLeaveRequest] Availability cleanup note:', e.message));
        }

        return { success: true };
    }
}

module.exports = new TeacherScheduleService();
