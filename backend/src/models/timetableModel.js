const pool = require('../config/db');

/**
 * Format local YYYY-MM-DD from Date
 */
const formatDate = (d) => {
    if (typeof d === 'string') return d.slice(0, 10);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Add days to YYYY-MM-DD string
 */
const addDays = (dateStr, days) => {
    const parts = dateStr.split('-');
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

const timetableModel = {
    /**
     * Get Hierarchical Options for Scheduler filter bars and dropdowns
     */
    async getTimetableOptions(tenantId, branchId = null, academicYearId = null) {
        // 1. Branches
        const [branches] = await pool.query(
            `SELECT id, name, code, status FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tenantId]
        );

        // 2. Academic Years
        const [academicYears] = await pool.query(
            `SELECT id, name, start_date, end_date, status FROM academic_years WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY id DESC`,
            [tenantId]
        );

        // 3. Courses Hierarchy: Courses -> Programs -> Levels -> Batches
        const [courses] = await pool.query(
            `SELECT id, name, code, is_active FROM courses WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tenantId]
        );

        const [programs] = await pool.query(
            `SELECT id, course_id, name, code, is_active FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tenantId]
        );

        const [levels] = await pool.query(
            `SELECT id, program_id, name, code, is_active FROM levels WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tenantId]
        );

        let batchQuery = `SELECT id, branch_id, level_id, academic_year_id, name, code, start_time, end_time, classroom_id, capacity, status 
                          FROM batches WHERE tenant_id = ? AND deleted_at IS NULL`;
        const batchParams = [tenantId];
        if (branchId && branchId !== 'All') {
            batchQuery += ` AND branch_id = ?`;
            batchParams.push(branchId);
        }
        batchQuery += ` ORDER BY name ASC`;
        const [batches] = await pool.query(batchQuery, batchParams);

        // 4. Subjects
        const [subjects] = await pool.query(
            `SELECT id, name, code, type, status FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tenantId]
        );

        // 5. Teachers (Users with teacher role or in staff_profiles)
        const [teachers] = await pool.query(
            `SELECT u.id, u.name, u.name AS full_name, u.email, u.mobile, JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]')) AS primary_branch_id,
                    sp.designation, sp.max_lectures_per_day, sp.max_lectures_per_week
             FROM users u
             LEFT JOIN staff_profiles sp ON u.id = sp.user_id AND sp.tenant_id = u.tenant_id
             LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.tenant_id = ? AND u.deleted_at IS NULL AND u.status = 'active'
               AND (r.code = 'teacher' OR sp.employee_type = 'Teaching')
             GROUP BY u.id
             ORDER BY u.name ASC`,
            [tenantId]
        );

        // 6. Classrooms
        let roomQuery = `SELECT id, branch_id, name, room_number, capacity, type, status 
                         FROM classrooms WHERE tenant_id = ? AND deleted_at IS NULL`;
        const roomParams = [tenantId];
        if (branchId && branchId !== 'All') {
            roomQuery += ` AND branch_id = ?`;
            roomParams.push(branchId);
        }
        roomQuery += ` ORDER BY name ASC`;
        const [classrooms] = await pool.query(roomQuery, roomParams);

        // 7. Teacher Allocations (Teacher-to-Batch Mappings)
        const [teacherAllocations] = await pool.query(
            `SELECT id, branch_id, academic_year_id, batch_id, teacher_user_id
             FROM teacher_allocations WHERE tenant_id = ? AND deleted_at IS NULL`,
            [tenantId]
        );

        // 8. Level Subjects (Subjects assigned to Level)
        const [levelSubjects] = await pool.query(
            `SELECT id, level_id, subject_id FROM level_subjects WHERE tenant_id = ?`,
            [tenantId]
        );

        // 9. Teacher Subjects (Subjects taught by Teacher)
        const [teacherSubjects] = await pool.query(
            `SELECT id, teacher_user_id, subject_id FROM teacher_subjects WHERE tenant_id = ?`,
            [tenantId]
        );

        return {
            branches,
            academicYears,
            courses,
            programs,
            levels,
            batches,
            subjects,
            teachers,
            classrooms,
            teacherAllocations,
            levelSubjects,
            teacherSubjects
        };
    },

    /**
     * Get Default Timetable Template slots for a batch
     */
    async getDefaultTimetable(tenantId, batchId) {
        const [rows] = await pool.query(
            `SELECT l.id, l.tenant_id, l.branch_id, l.academic_year_id, l.batch_id,
                    l.day_of_week, l.start_time, l.end_time,
                    l.subject_id, s.name AS subject_name, s.code AS subject_code,
                    l.teacher_user_id, u.name AS teacher_name,
                    l.classroom_id, c.name AS classroom_name, c.room_number,
                    l.lecture_type, l.activity_type, l.slot_label, l.status, l.is_active,
                    l.created_at, l.updated_at
             FROM lectures l
             LEFT JOIN subjects s ON l.subject_id = s.id
             LEFT JOIN users u ON l.teacher_user_id = u.id
             LEFT JOIN classrooms c ON l.classroom_id = c.id
             WHERE l.tenant_id = ? AND l.batch_id = ? AND l.is_default = 1 AND l.deleted_at IS NULL
             ORDER BY l.day_of_week ASC, l.start_time ASC`,
            [tenantId, batchId]
        );
        return rows;
    },

    /**
     * Save / Replace Default Timetable Template slots for a batch
     */
    async saveDefaultTimetable(tenantId, batchId, slots, branchId, academicYearId, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Delete previous default slots for this batch
            await connection.query(
                `DELETE FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 1`,
                [tenantId, batchId]
            );

            // 2. Insert new default slots
            if (Array.isArray(slots) && slots.length > 0) {
                const insertValues = slots.map(slot => [
                    tenantId,
                    branchId || slot.branch_id || slot.branchId || 1,
                    academicYearId || slot.academic_year_id || slot.academicYearId || 1,
                    batchId,
                    1, // is_default = 1
                    slot.day_of_week || slot.dayOfWeek || 1,
                    null, // lecture_date is NULL for defaults
                    slot.start_time || slot.startTime || '09:00:00',
                    slot.end_time || slot.endTime || '10:30:00',
                    slot.subject_id || slot.subjectId,
                    slot.teacher_user_id || slot.teacherId,
                    slot.classroom_id || slot.roomId || null,
                    slot.lecture_type || slot.lectureType || 'Regular',
                    slot.activity_type || slot.activityType || 'Lecture',
                    slot.slot_label || slot.slotLabel || null,
                    'scheduled',
                    1, // is_active
                    userId || null,
                    userId || null
                ]);

                await connection.query(
                    `INSERT INTO lectures (
                        tenant_id, branch_id, academic_year_id, batch_id,
                        is_default, day_of_week, lecture_date,
                        start_time, end_time, subject_id, teacher_user_id, classroom_id,
                        lecture_type, activity_type, slot_label, status, is_active,
                        created_by, updated_by
                    ) VALUES ?`,
                    [insertValues]
                );
            }

            await connection.commit();
            return { success: true, count: slots.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Clone Default Timetable from one batch to other target batches
     */
    async cloneDefaultTimetable(tenantId, sourceBatchId, targetBatchIds, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Fetch source default slots
            const [sourceSlots] = await connection.query(
                `SELECT * FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 1 AND deleted_at IS NULL`,
                [tenantId, sourceBatchId]
            );

            if (sourceSlots.length === 0) {
                throw new Error('Source batch does not have a default timetable configured.');
            }

            for (const targetBatchId of targetBatchIds) {
                // Delete existing default slots for target
                await connection.query(
                    `DELETE FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 1`,
                    [tenantId, targetBatchId]
                );

                // Insert copied slots
                const targetValues = sourceSlots.map(slot => [
                    tenantId,
                    slot.branch_id,
                    slot.academic_year_id,
                    targetBatchId,
                    1,
                    slot.day_of_week,
                    null,
                    slot.start_time,
                    slot.end_time,
                    slot.subject_id,
                    slot.teacher_user_id,
                    slot.classroom_id,
                    slot.lecture_type,
                    slot.activity_type,
                    slot.slot_label,
                    'scheduled',
                    1,
                    userId || null,
                    userId || null
                ]);

                await connection.query(
                    `INSERT INTO lectures (
                        tenant_id, branch_id, academic_year_id, batch_id,
                        is_default, day_of_week, lecture_date,
                        start_time, end_time, subject_id, teacher_user_id, classroom_id,
                        lecture_type, activity_type, slot_label, status, is_active,
                        created_by, updated_by
                    ) VALUES ?`,
                    [targetValues]
                );
            }

            await connection.commit();
            return { success: true, copiedCount: sourceSlots.length, targetBatchesCount: targetBatchIds.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Get Weekly Lectures (Concrete Calendar View)
     */
    async getWeeklyLectures(tenantId, filters) {
        const {
            batchId,
            teacherId,
            roomId,
            branchId,
            startDate,
            endDate
        } = filters;

        let query = `
            SELECT l.id, l.tenant_id, l.branch_id, l.academic_year_id, l.batch_id,
                   b.name AS batch_name, b.code AS batch_code,
                   l.parent_template_id, l.day_of_week, 
                   DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS lecture_date,
                   l.start_time, l.end_time,
                   l.subject_id, s.name AS subject_name, s.code AS subject_code,
                   l.teacher_user_id, u.name AS teacher_name,
                   l.classroom_id, c.name AS classroom_name, c.room_number,
                   l.lecture_type, l.activity_type, l.slot_label, l.topic,
                   l.status, l.is_modified_from_default, l.cancellation_reason, l.is_active,
                   l.created_at, l.updated_at
            FROM lectures l
            LEFT JOIN batches b ON l.batch_id = b.id
            LEFT JOIN subjects s ON l.subject_id = s.id
            LEFT JOIN users u ON l.teacher_user_id = u.id
            LEFT JOIN classrooms c ON l.classroom_id = c.id
            WHERE l.tenant_id = ? AND l.is_default = 0 AND l.deleted_at IS NULL
        `;

        const params = [tenantId];

        if (startDate && endDate) {
            query += ` AND l.lecture_date BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ` AND l.lecture_date >= ?`;
            params.push(startDate);
        }

        if (batchId && batchId !== 'All') {
            query += ` AND l.batch_id = ?`;
            params.push(batchId);
        } else if (branchId && branchId !== 'All') {
            query += ` AND l.branch_id = ?`;
            params.push(branchId);
        }

        if (teacherId && teacherId !== 'All') {
            query += ` AND l.teacher_user_id = ?`;
            params.push(teacherId);
        }

        if (roomId && roomId !== 'All') {
            query += ` AND l.classroom_id = ?`;
            params.push(roomId);
        }

        query += ` ORDER BY l.lecture_date ASC, l.start_time ASC`;

        const [rows] = await pool.query(query, params);
        return rows;
    },

    /**
     * Apply Default Timetable to a specific week (Generate actual lectures)
     */
    async applyDefaultTimetableToWeek(tenantId, options) {
        const {
            batchId,
            weekStartDate, // Monday of week: 'YYYY-MM-DD'
            overwriteExisting = false,
            skipHolidays = true,
            userId
        } = options;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Fetch default template slots for batch
            const [defaultSlots] = await connection.query(
                `SELECT * FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 1 AND is_active = 1 AND deleted_at IS NULL`,
                [tenantId, batchId]
            );

            if (defaultSlots.length === 0) {
                throw new Error('No default timetable found for this batch. Please configure default timetable first.');
            }

            const weekEndDate = addDays(weekStartDate, 6);

            // 2. Fetch holidays in this week for this branch
            const branchId = defaultSlots[0].branch_id;
            const [holidays] = await connection.query(
                `SELECT holiday_date, name FROM holidays 
                 WHERE tenant_id = ? AND branch_id = ? AND holiday_date BETWEEN ? AND ?`,
                [tenantId, branchId, weekStartDate, weekEndDate]
            );
            const holidayDates = new Set(holidays.map(h => formatDate(new Date(h.holiday_date))));

            // 3. If overwriteExisting = true, clear existing lectures for this batch in that week
            if (overwriteExisting) {
                await connection.query(
                    `DELETE FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 0 AND lecture_date BETWEEN ? AND ?`,
                    [tenantId, batchId, weekStartDate, weekEndDate]
                );
            }

            // 4. Generate lectures for each default slot
            const generatedLectures = [];
            for (const slot of defaultSlots) {
                // slot.day_of_week: 1=Mon, 2=Tue, ..., 7=Sun
                const dayOffset = (slot.day_of_week || 1) - 1;
                const slotDate = addDays(weekStartDate, dayOffset);

                // Skip if holiday
                if (skipHolidays && holidayDates.has(slotDate)) {
                    continue;
                }

                // Check if already exists (if not overwriting)
                if (!overwriteExisting) {
                    const [existing] = await connection.query(
                        `SELECT id FROM lectures 
                         WHERE tenant_id = ? AND batch_id = ? AND is_default = 0 
                           AND lecture_date = ? AND start_time = ? AND deleted_at IS NULL LIMIT 1`,
                        [tenantId, batchId, slotDate, slot.start_time]
                    );
                    if (existing.length > 0) {
                        continue; // Skip duplicate
                    }
                }

                generatedLectures.push([
                    tenantId,
                    slot.branch_id,
                    slot.academic_year_id,
                    batchId,
                    0, // is_default = 0
                    slot.id, // parent_template_id
                    slot.day_of_week,
                    slotDate,
                    slot.start_time,
                    slot.end_time,
                    slot.subject_id,
                    slot.teacher_user_id,
                    slot.classroom_id,
                    slot.lecture_type || 'Regular',
                    slot.activity_type || 'Lecture',
                    slot.slot_label || null,
                    null, // topic
                    'scheduled',
                    0, // is_modified_from_default
                    null, // cancellation_reason
                    1, // is_active
                    userId || null,
                    userId || null
                ]);
            }

            if (generatedLectures.length > 0) {
                await connection.query(
                    `INSERT INTO lectures (
                        tenant_id, branch_id, academic_year_id, batch_id,
                        is_default, parent_template_id, day_of_week, lecture_date,
                        start_time, end_time, subject_id, teacher_user_id, classroom_id,
                        lecture_type, activity_type, slot_label, topic, status,
                        is_modified_from_default, cancellation_reason, is_active,
                        created_by, updated_by
                    ) VALUES ?`,
                    [generatedLectures]
                );
            }

            await connection.commit();
            return {
                success: true,
                generatedCount: generatedLectures.length,
                weekStartDate,
                weekEndDate
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Replicate week's schedule to another week
     */
    async replicateWeekLectures(tenantId, options) {
        const {
            batchId,
            sourceWeekStart,
            targetWeekStart,
            overwriteExisting = true,
            userId
        } = options;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const sourceWeekEnd = addDays(sourceWeekStart, 6);
            const targetWeekEnd = addDays(targetWeekStart, 6);

            // Fetch source lectures
            const [sourceLectures] = await connection.query(
                `SELECT * FROM lectures 
                 WHERE tenant_id = ? AND batch_id = ? AND is_default = 0 
                   AND lecture_date BETWEEN ? AND ? AND deleted_at IS NULL AND status != 'cancelled'`,
                [tenantId, batchId, sourceWeekStart, sourceWeekEnd]
            );

            if (sourceLectures.length === 0) {
                throw new Error('No active lectures found in source week to replicate.');
            }

            if (overwriteExisting) {
                await connection.query(
                    `DELETE FROM lectures WHERE tenant_id = ? AND batch_id = ? AND is_default = 0 AND lecture_date BETWEEN ? AND ?`,
                    [tenantId, batchId, targetWeekStart, targetWeekEnd]
                );
            }

            const targetRows = sourceLectures.map(lec => {
                const srcDate = formatDate(new Date(lec.lecture_date));
                const diffTime = Math.abs(new Date(srcDate) - new Date(sourceWeekStart));
                const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
                const targetDate = addDays(targetWeekStart, dayOffset);

                return [
                    tenantId,
                    lec.branch_id,
                    lec.academic_year_id,
                    batchId,
                    0,
                    lec.parent_template_id || null,
                    lec.day_of_week || (dayOffset + 1),
                    targetDate,
                    lec.start_time,
                    lec.end_time,
                    lec.subject_id,
                    lec.teacher_user_id,
                    lec.classroom_id,
                    lec.lecture_type,
                    lec.activity_type,
                    lec.slot_label,
                    lec.topic,
                    'scheduled',
                    lec.is_modified_from_default,
                    null,
                    1,
                    userId || null,
                    userId || null
                ];
            });

            await connection.query(
                `INSERT INTO lectures (
                    tenant_id, branch_id, academic_year_id, batch_id,
                    is_default, parent_template_id, day_of_week, lecture_date,
                    start_time, end_time, subject_id, teacher_user_id, classroom_id,
                    lecture_type, activity_type, slot_label, topic, status,
                    is_modified_from_default, cancellation_reason, is_active,
                    created_by, updated_by
                ) VALUES ?`,
                [targetRows]
            );

            await connection.commit();
            return { success: true, count: targetRows.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Create single calendar lecture
     */
    async createLecture(tenantId, data, userId) {
        const [res] = await pool.query(
            `INSERT INTO lectures (
                tenant_id, branch_id, academic_year_id, batch_id,
                is_default, parent_template_id, day_of_week, lecture_date,
                start_time, end_time, subject_id, teacher_user_id, classroom_id,
                lecture_type, activity_type, slot_label, topic, status,
                is_modified_from_default, cancellation_reason, is_active,
                created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                data.branch_id || data.branchId,
                data.academic_year_id || data.academicYearId || 1,
                data.batch_id || data.batchId,
                data.is_default ? 1 : 0,
                data.parent_template_id || null,
                data.day_of_week || null,
                data.lecture_date || data.date || null,
                data.start_time || data.startTime,
                data.end_time || data.endTime,
                data.subject_id || data.subjectId,
                data.teacher_user_id || data.teacherId,
                data.classroom_id || data.roomId || null,
                data.lecture_type || data.lectureType || 'Regular',
                data.activity_type || data.activityType || 'Lecture',
                data.slot_label || null,
                data.topic || null,
                data.status || 'scheduled',
                data.is_modified_from_default || 0,
                null,
                1,
                userId || null,
                userId || null
            ]
        );
        return { id: res.insertId, ...data };
    },

    /**
     * Update single lecture
     */
    async updateLecture(tenantId, id, data, userId) {
        const isModified = data.parent_template_id ? 1 : (data.is_modified_from_default || 0);

        await pool.query(
            `UPDATE lectures SET
                branch_id = COALESCE(?, branch_id),
                batch_id = COALESCE(?, batch_id),
                subject_id = COALESCE(?, subject_id),
                teacher_user_id = COALESCE(?, teacher_user_id),
                classroom_id = ?,
                lecture_date = COALESCE(?, lecture_date),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                lecture_type = COALESCE(?, lecture_type),
                activity_type = COALESCE(?, activity_type),
                slot_label = COALESCE(?, slot_label),
                topic = COALESCE(?, topic),
                status = COALESCE(?, status),
                is_modified_from_default = ?,
                updated_by = ?
             WHERE id = ? AND tenant_id = ?`,
            [
                data.branch_id || data.branchId,
                data.batch_id || data.batchId,
                data.subject_id || data.subjectId,
                data.teacher_user_id || data.teacherId,
                data.classroom_id !== undefined ? data.classroom_id : (data.roomId !== undefined ? data.roomId : null),
                data.lecture_date || data.date,
                data.start_time || data.startTime,
                data.end_time || data.endTime,
                data.lecture_type || data.lectureType,
                data.activity_type || data.activityType,
                data.slot_label || data.slotLabel,
                data.topic,
                data.status,
                isModified,
                userId || null,
                id,
                tenantId
            ]
        );
        return { id, ...data };
    },

    /**
     * Cancel lecture
     */
    async cancelLecture(tenantId, id, cancellationReason, userId) {
        await pool.query(
            `UPDATE lectures SET 
                status = 'cancelled', 
                cancellation_reason = ?, 
                updated_by = ? 
             WHERE id = ? AND tenant_id = ?`,
            [cancellationReason || 'Lecture cancelled by administrator', userId || null, id, tenantId]
        );
        return { success: true, id };
    },

    /**
     * Delete lecture (Soft delete)
     */
    async deleteLecture(tenantId, id, userId) {
        await pool.query(
            `UPDATE lectures SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND tenant_id = ?`,
            [userId || null, id, tenantId]
        );
        return { success: true, id };
    }
};

module.exports = timetableModel;
