const pool = require('../config/db');

/**
 * Service to validate lecture conflicts (Teacher, Classroom, Batch, and Holidays).
 */
const conflictService = {
    /**
     * Check if proposed lecture has conflicts with existing calendar lectures or holidays.
     */
    async checkLectureConflicts(tenantId, params) {
        const {
            lectureId = null,
            branchId,
            batchId,
            teacherUserId,
            classroomId,
            lectureDate,
            startTime,
            endTime
        } = params;

        const conflicts = [];

        if (!lectureDate || !startTime || !endTime) {
            return conflicts;
        }

        // 1. Holiday Check
        if (branchId) {
            const [holidayRows] = await pool.query(
                `SELECT name, description FROM holidays 
                 WHERE tenant_id = ? AND branch_id = ? AND holiday_date = ? LIMIT 1`,
                [tenantId, branchId, lectureDate]
            );
            if (holidayRows.length > 0) {
                conflicts.push({
                    type: 'holiday',
                    severity: 'warning',
                    message: `Official Holiday: "${holidayRows[0].name}" on ${lectureDate}.`
                });
            }
        }

        // Base exclusion clause for editing current lecture
        let excludeClause = '';
        const queryParams = [tenantId, lectureDate, startTime, endTime, endTime, startTime];
        if (lectureId) {
            excludeClause = ' AND l.id != ?';
        }

        // 2. Teacher Conflict Check (Teacher already booked at this time on this date)
        if (teacherUserId) {
            const teacherParams = [...queryParams];
            if (lectureId) teacherParams.push(lectureId);
            teacherParams.push(teacherUserId);

            const [teacherClashes] = await pool.query(
                `SELECT l.id, l.start_time, l.end_time, b.name AS batch_name, s.name AS subject_name
                 FROM lectures l
                 LEFT JOIN batches b ON l.batch_id = b.id
                 LEFT JOIN subjects s ON l.subject_id = s.id
                 WHERE l.tenant_id = ? AND l.is_default = 0 AND l.status != 'cancelled' AND l.deleted_at IS NULL
                   AND l.lecture_date = ?
                   AND NOT (l.end_time <= ? OR l.start_time >= ?)
                   ${excludeClause}
                   AND l.teacher_user_id = ?
                 LIMIT 3`,
                teacherParams
            );

            if (teacherClashes.length > 0) {
                const clash = teacherClashes[0];
                conflicts.push({
                    type: 'teacher_clash',
                    severity: 'danger',
                    conflictingLectureId: clash.id,
                    message: `Faculty is already booked for ${clash.batch_name || 'another batch'} (${clash.subject_name || 'Lecture'}, ${clash.start_time.slice(0, 5)} - ${clash.end_time.slice(0, 5)}).`
                });
            }
        }

        // 3. Classroom Conflict Check (Classroom already booked at this time on this date)
        if (classroomId) {
            const roomParams = [...queryParams];
            if (lectureId) roomParams.push(lectureId);
            roomParams.push(classroomId);

            const [roomClashes] = await pool.query(
                `SELECT l.id, l.start_time, l.end_time, b.name AS batch_name, c.name AS room_name
                 FROM lectures l
                 LEFT JOIN batches b ON l.batch_id = b.id
                 LEFT JOIN classrooms c ON l.classroom_id = c.id
                 WHERE l.tenant_id = ? AND l.is_default = 0 AND l.status != 'cancelled' AND l.deleted_at IS NULL
                   AND l.lecture_date = ?
                   AND NOT (l.end_time <= ? OR l.start_time >= ?)
                   ${excludeClause}
                   AND l.classroom_id = ?
                 LIMIT 3`,
                roomParams
            );

            if (roomClashes.length > 0) {
                const clash = roomClashes[0];
                conflicts.push({
                    type: 'room_clash',
                    severity: 'danger',
                    conflictingLectureId: clash.id,
                    message: `Classroom "${clash.room_name || 'Room'}" is already occupied by ${clash.batch_name || 'another batch'} (${clash.start_time.slice(0, 5)} - ${clash.end_time.slice(0, 5)}).`
                });
            }
        }

        // 4. Batch Overlap Check (Batch already has a lecture at this time on this date)
        if (batchId) {
            const batchParams = [...queryParams];
            if (lectureId) batchParams.push(lectureId);
            batchParams.push(batchId);

            const [batchClashes] = await pool.query(
                `SELECT l.id, l.start_time, l.end_time, s.name AS subject_name
                 FROM lectures l
                 LEFT JOIN subjects s ON l.subject_id = s.id
                 WHERE l.tenant_id = ? AND l.is_default = 0 AND l.status != 'cancelled' AND l.deleted_at IS NULL
                   AND l.lecture_date = ?
                   AND NOT (l.end_time <= ? OR l.start_time >= ?)
                   ${excludeClause}
                   AND l.batch_id = ?
                 LIMIT 3`,
                batchParams
            );

            if (batchClashes.length > 0) {
                const clash = batchClashes[0];
                conflicts.push({
                    type: 'batch_clash',
                    severity: 'danger',
                    conflictingLectureId: clash.id,
                    message: `This batch already has a scheduled ${clash.subject_name || 'lecture'} at ${clash.start_time.slice(0, 5)} - ${clash.end_time.slice(0, 5)}.`
                });
            }
        }

        // 5. Workload limits check for faculty (max lectures per day)
        if (teacherUserId) {
            const workloadParams = [tenantId, lectureDate];
            if (lectureId) workloadParams.push(lectureId);
            workloadParams.push(teacherUserId);

            const [dayCountRows] = await pool.query(
                `SELECT COUNT(*) AS total_today, sp.max_lectures_per_day
                 FROM lectures l
                 LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.tenant_id = l.tenant_id
                 WHERE l.tenant_id = ? AND l.is_default = 0 AND l.status != 'cancelled' AND l.deleted_at IS NULL
                   AND l.lecture_date = ?
                   ${excludeClause}
                   AND l.teacher_user_id = ?
                 GROUP BY sp.max_lectures_per_day`,
                workloadParams
            );

            if (dayCountRows.length > 0 && dayCountRows[0].max_lectures_per_day) {
                const total = dayCountRows[0].total_today;
                const max = dayCountRows[0].max_lectures_per_day;
                if (total >= max) {
                    conflicts.push({
                        type: 'workload_limit',
                        severity: 'warning',
                        message: `Faculty exceeds daily limit (${total}/${max} lectures scheduled for ${lectureDate}).`
                    });
                }
            }
        }

        return conflicts;
    }
};

module.exports = conflictService;
