const pool = require('../../config/db');

class AppScheduleModel {
    /**
     * Find student's active batch details by userId
     */
    async getStudentBatchContext(tenantId, userId) {
        const query = `
            SELECT 
                se.id AS enrollment_id,
                se.student_id,
                se.batch_id,
                se.branch_id,
                se.academic_year_id,
                b.name AS batch_name,
                b.code AS batch_code,
                s.full_name AS student_name
            FROM student_enrollments se
            INNER JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
            INNER JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            WHERE s.user_id = ? AND se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get concrete calendar lectures for a specific date
     */
    async getConcreteLecturesForDate(tenantId, batchId, dateStr) {
        const query = `
            SELECT 
                l.id AS lecture_id,
                l.tenant_id,
                l.branch_id,
                l.batch_id,
                l.academic_year_id,
                l.is_default,
                l.day_of_week,
                l.lecture_date,
                l.start_time,
                l.end_time,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                l.teacher_user_id,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation,
                sp.profile_photo_url AS teacher_photo_url,
                u.name AS teacher_user_name,
                l.classroom_id,
                cr.name AS classroom_name,
                cr.room_number AS classroom_room_number,
                l.lecture_type,
                l.activity_type,
                l.slot_label,
                l.topic,
                l.status,
                l.is_modified_from_default,
                l.cancellation_reason
            FROM lectures l
            INNER JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users u ON u.id = l.teacher_user_id AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.deleted_at IS NULL
            LEFT JOIN classrooms cr ON cr.id = l.classroom_id AND cr.deleted_at IS NULL
            WHERE l.batch_id = ? 
              AND l.tenant_id = ? 
              AND l.is_default = 0 
              AND l.lecture_date = ? 
              AND l.deleted_at IS NULL
            ORDER BY l.start_time ASC
        `;
        const [rows] = await pool.query(query, [batchId, tenantId, dateStr]);
        return rows;
    }

    /**
     * Get default recurring template lectures for a given day of the week (1=Mon ... 7=Sun)
     */
    async getDefaultTemplateLecturesForDay(tenantId, batchId, dayOfWeek) {
        const query = `
            SELECT 
                l.id AS lecture_id,
                l.tenant_id,
                l.branch_id,
                l.batch_id,
                l.academic_year_id,
                l.is_default,
                l.day_of_week,
                l.lecture_date,
                l.start_time,
                l.end_time,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                l.teacher_user_id,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation,
                sp.profile_photo_url AS teacher_photo_url,
                u.name AS teacher_user_name,
                l.classroom_id,
                cr.name AS classroom_name,
                cr.room_number AS classroom_room_number,
                l.lecture_type,
                l.activity_type,
                l.slot_label,
                l.topic,
                l.status,
                l.is_modified_from_default,
                l.cancellation_reason
            FROM lectures l
            INNER JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users u ON u.id = l.teacher_user_id AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.deleted_at IS NULL
            LEFT JOIN classrooms cr ON cr.id = l.classroom_id AND cr.deleted_at IS NULL
            WHERE l.batch_id = ? 
              AND l.tenant_id = ? 
              AND l.is_default = 1 
              AND l.day_of_week = ? 
              AND l.deleted_at IS NULL
            ORDER BY l.start_time ASC
        `;
        const [rows] = await pool.query(query, [batchId, tenantId, dayOfWeek]);
        return rows;
    }

    /**
     * Get single lecture session by ID
     */
    async getLectureById(tenantId, batchId, lectureId) {
        const query = `
            SELECT 
                l.id AS lecture_id,
                l.tenant_id,
                l.branch_id,
                l.batch_id,
                l.academic_year_id,
                l.is_default,
                l.day_of_week,
                l.lecture_date,
                l.start_time,
                l.end_time,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                s.type AS subject_type,
                s.description AS subject_description,
                l.teacher_user_id,
                sp.first_name AS teacher_first_name,
                sp.last_name AS teacher_last_name,
                sp.designation AS teacher_designation,
                sp.qualification AS teacher_qualification,
                sp.personal_email AS teacher_email,
                sp.profile_photo_url AS teacher_photo_url,
                u.name AS teacher_user_name,
                l.classroom_id,
                cr.name AS classroom_name,
                cr.room_number AS classroom_room_number,
                cr.type AS classroom_type,
                l.lecture_type,
                l.activity_type,
                l.slot_label,
                l.topic,
                l.status,
                l.is_modified_from_default,
                l.cancellation_reason,
                l.created_at,
                l.updated_at
            FROM lectures l
            INNER JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
            LEFT JOIN users u ON u.id = l.teacher_user_id AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = l.teacher_user_id AND sp.deleted_at IS NULL
            LEFT JOIN classrooms cr ON cr.id = l.classroom_id AND cr.deleted_at IS NULL
            WHERE l.id = ? 
              AND l.batch_id = ? 
              AND l.tenant_id = ? 
              AND l.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [lectureId, batchId, tenantId]);
        return rows[0] || null;
    }
}

module.exports = new AppScheduleModel();
