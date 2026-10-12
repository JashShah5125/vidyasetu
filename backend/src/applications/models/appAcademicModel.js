const pool = require('../../config/db');

class AppAcademicModel {
    /**
     * Get active enrollment details for a student user
     */
    async getActiveEnrollmentByUserId(tenantId, userId) {
        const query = `
            SELECT 
                se.id AS enrollment_id,
                se.tenant_id,
                se.student_id,
                se.branch_id,
                se.batch_id,
                se.academic_year_id,
                se.bundle_id,
                se.subject_selection_type,
                se.custom_subject_ids,
                se.enrolled_date,
                se.status AS enrollment_status,
                se.app_access_enabled,
                -- Student Profile
                s.student_code,
                s.full_name AS student_name,
                s.current_class,
                s.target_exam,
                -- Batch Info
                b.name AS batch_name,
                b.code AS batch_code,
                b.level_id,
                b.start_time AS batch_start_time,
                b.end_time AS batch_end_time,
                b.capacity AS batch_capacity,
                b.current_strength AS batch_current_strength,
                b.classroom_id,
                cr.name AS classroom_name,
                cr.room_number AS classroom_room_number,
                cr.type AS classroom_type,
                -- Level Info
                l.name AS level_name,
                l.code AS level_code,
                l.duration AS level_duration,
                l.program_id,
                -- Program Info
                p.name AS program_name,
                p.code AS program_code,
                p.duration AS program_duration,
                p.course_id,
                -- Course Info
                c.name AS course_name,
                c.code AS course_code,
                c.description AS course_description,
                -- Academic Year Info
                ay.name AS academic_year_name,
                ay.start_date AS academic_year_start_date,
                ay.end_date AS academic_year_end_date,
                -- Branch Info
                br.name AS branch_name,
                br.code AS branch_code,
                br.city AS branch_city,
                br.state AS branch_state,
                br.pincode AS branch_pincode,
                br.address_line1 AS branch_address,
                br.phone AS branch_phone,
                br.email AS branch_email
            FROM student_enrollments se
            INNER JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
            INNER JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            LEFT JOIN classrooms cr ON cr.id = b.classroom_id AND cr.deleted_at IS NULL
            LEFT JOIN levels l ON l.id = b.level_id AND l.deleted_at IS NULL
            LEFT JOIN programs p ON p.id = l.program_id AND p.deleted_at IS NULL
            LEFT JOIN courses c ON c.id = p.course_id AND c.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.deleted_at IS NULL
            LEFT JOIN branches br ON br.id = se.branch_id AND br.deleted_at IS NULL
            WHERE s.user_id = ? AND se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get list of subjects enrolled by the student
     */
    async getEnrolledSubjects(tenantId, levelId, bundleId = null, customSubjectIds = null) {
        let rows = [];

        // 1. If custom subject IDs array is defined
        if (customSubjectIds && Array.isArray(customSubjectIds) && customSubjectIds.length > 0) {
            const placeholders = customSubjectIds.map(() => '?').join(',');
            const query = `
                SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.type AS subject_type, s.description
                FROM subjects s
                WHERE s.id IN (${placeholders}) AND s.tenant_id = ? AND s.deleted_at IS NULL
                ORDER BY s.name ASC
            `;
            const [customRows] = await pool.query(query, [...customSubjectIds, tenantId]);
            rows = customRows;
        } 
        // 2. If subject bundle is assigned
        else if (bundleId) {
            const query = `
                SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.type AS subject_type, s.description
                FROM bundle_subjects bs
                INNER JOIN subjects s ON s.id = bs.subject_id AND s.deleted_at IS NULL
                WHERE bs.bundle_id = ? AND s.tenant_id = ?
                ORDER BY s.name ASC
            `;
            const [bundleRows] = await pool.query(query, [bundleId, tenantId]);
            rows = bundleRows;
        }

        // 3. Fallback / Default: All subjects linked to this Batch's Level
        if (!rows || rows.length === 0) {
            const query = `
                SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.type AS subject_type, s.description
                FROM level_subjects ls
                INNER JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
                WHERE ls.level_id = ? AND ls.tenant_id = ?
                ORDER BY s.name ASC
            `;
            const [levelRows] = await pool.query(query, [levelId, tenantId]);
            rows = levelRows;
        }

        return rows;
    }

    /**
     * Get assigned faculty members for the student's batch with subjects taught
     */
    async getAssignedFacultyForBatch(tenantId, batchId) {
        // Fetch teachers from allocations & distinct lecture schedules
        const query = `
            SELECT DISTINCT
                u.id AS teacher_user_id,
                u.email AS user_email,
                u.mobile AS user_mobile,
                sp.id AS staff_profile_id,
                sp.employee_id,
                sp.first_name,
                sp.last_name,
                sp.designation,
                sp.qualification,
                sp.experience,
                sp.personal_email,
                sp.profile_photo_url
            FROM teacher_allocations ta
            INNER JOIN users u ON u.id = ta.teacher_user_id AND u.deleted_at IS NULL
            LEFT JOIN staff_profiles sp ON sp.user_id = u.id AND sp.deleted_at IS NULL
            WHERE ta.batch_id = ? AND ta.tenant_id = ? AND ta.deleted_at IS NULL
            ORDER BY sp.first_name ASC, sp.last_name ASC
        `;
        const [teachers] = await pool.query(query, [batchId, tenantId]);

        if (teachers.length === 0) {
            return [];
        }

        // For each teacher, query which subjects they teach in this batch from lectures
        const teacherIds = teachers.map(t => t.teacher_user_id);
        const placeholders = teacherIds.map(() => '?').join(',');

        const subjectsQuery = `
            SELECT DISTINCT
                l.teacher_user_id,
                l.subject_id,
                s.name AS subject_name,
                s.code AS subject_code
            FROM lectures l
            INNER JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
            WHERE l.batch_id = ? AND l.tenant_id = ? AND l.teacher_user_id IN (${placeholders}) AND l.deleted_at IS NULL
        `;
        const [subjectRows] = await pool.query(subjectsQuery, [batchId, tenantId, ...teacherIds]);

        // Map subjects to teachers
        const teacherSubjectMap = {};
        for (const row of subjectRows) {
            if (!teacherSubjectMap[row.teacher_user_id]) {
                teacherSubjectMap[row.teacher_user_id] = [];
            }
            teacherSubjectMap[row.teacher_user_id].push({
                subjectId: row.subject_id,
                subjectName: row.subject_name,
                subjectCode: row.subject_code
            });
        }

        return teachers.map(t => {
            const fullName = [t.first_name, t.last_name].filter(Boolean).join(' ') || 'Faculty Member';
            return {
                teacherId: t.teacher_user_id,
                employeeId: t.employee_id,
                fullName,
                designation: t.designation || 'Faculty Member',
                qualification: t.qualification || null,
                experience: t.experience ? `${t.experience} years` : null,
                email: t.personal_email || t.user_email || null,
                profilePhotoUrl: t.profile_photo_url || null,
                subjects: teacherSubjectMap[t.teacher_user_id] || []
            };
        });
    }
}

module.exports = new AppAcademicModel();
