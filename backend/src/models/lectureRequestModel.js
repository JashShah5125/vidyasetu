const pool = require('../config/db');

const lectureRequestModel = {

    async createRequest(tenantId, data, userId) {
        const [result] = await pool.query(
            `INSERT INTO lecture_requests (
                tenant_id, branch_id, requester_id,
                lecture_id, batch_id, subject_id,
                request_type,
                \`current_date\`, current_start_time, current_end_time,
                current_classroom_id, current_teacher_user_id,
                requested_date, requested_start_time, requested_end_time,
                requested_classroom_id, requested_teacher_user_id,
                reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                data.branch_id || data.branchId,
                userId,
                data.lecture_id || data.lectureId || null,
                data.batch_id || data.batchId,
                data.subject_id || data.subjectId,
                data.request_type || data.requestType,
                data.current_date || data.currentDate || null,
                data.current_start_time || data.currentStartTime || null,
                data.current_end_time || data.currentEndTime || null,
                data.current_classroom_id || data.currentClassroomId || null,
                data.current_teacher_user_id || data.currentTeacherUserId || null,
                data.requested_date || data.requestedDate || null,
                data.requested_start_time || data.requestedStartTime || null,
                data.requested_end_time || data.requestedEndTime || null,
                data.requested_classroom_id || data.requestedClassroomId || null,
                data.requested_teacher_user_id || data.requestedTeacherUserId || null,
                data.reason || null
            ]
        );
        return { id: result.insertId };
    },

    async getRequestById(tenantId, requestId) {
        const [rows] = await pool.query(
            `SELECT lr.*,
                req.name AS requester_name,
                req.email AS requester_email,
                b.name AS batch_name, b.code AS batch_code,
                s.name AS subject_name, s.code AS subject_code,
                dec_u.name AS decided_by_name,
                app.name AS applied_by_name,
                curr_cr.name AS current_classroom_name,
                curr_cr.room_number AS current_classroom_number,
                curr_t.name AS current_teacher_name,
                req_cr.name AS requested_classroom_name,
                req_cr.room_number AS requested_classroom_number,
                req_t.name AS requested_teacher_name,
                br.name AS branch_name
             FROM lecture_requests lr
             LEFT JOIN users req ON lr.requester_id = req.id
             LEFT JOIN users dec_u ON lr.decided_by = dec_u.id
             LEFT JOIN users app ON lr.applied_by = app.id
             LEFT JOIN batches b ON lr.batch_id = b.id
             LEFT JOIN subjects s ON lr.subject_id = s.id
             LEFT JOIN classrooms curr_cr ON lr.current_classroom_id = curr_cr.id
             LEFT JOIN users curr_t ON lr.current_teacher_user_id = curr_t.id
             LEFT JOIN classrooms req_cr ON lr.requested_classroom_id = req_cr.id
             LEFT JOIN users req_t ON lr.requested_teacher_user_id = req_t.id
             LEFT JOIN branches br ON lr.branch_id = br.id
             WHERE lr.tenant_id = ? AND lr.id = ?`,
            [tenantId, requestId]
        );
        return rows[0] || null;
    },

    async listRequests(tenantId, filters = {}) {
        let whereClause = 'WHERE lr.tenant_id = ?';
        const params = [tenantId];

        if (filters.branchId) {
            whereClause += ' AND lr.branch_id = ?';
            params.push(filters.branchId);
        }
        if (filters.status) {
            whereClause += ' AND lr.status = ?';
            params.push(filters.status);
        }
        if (filters.requestType) {
            whereClause += ' AND lr.request_type = ?';
            params.push(filters.requestType);
        }
        if (filters.requesterId) {
            whereClause += ' AND lr.requester_id = ?';
            params.push(filters.requesterId);
        }

        const [rows] = await pool.query(
            `SELECT lr.*,
                req.name AS requester_name,
                req.email AS requester_email,
                b.name AS batch_name, b.code AS batch_code,
                s.name AS subject_name,
                dec_u.name AS decided_by_name,
                br.name AS branch_name,
                curr_cr.name AS current_classroom_name,
                curr_t.name AS current_teacher_name,
                req_cr.name AS requested_classroom_name,
                req_t.name AS requested_teacher_name
             FROM lecture_requests lr
             LEFT JOIN users req ON lr.requester_id = req.id
             LEFT JOIN users dec_u ON lr.decided_by = dec_u.id
             LEFT JOIN batches b ON lr.batch_id = b.id
             LEFT JOIN subjects s ON lr.subject_id = s.id
             LEFT JOIN branches br ON lr.branch_id = br.id
             LEFT JOIN classrooms curr_cr ON lr.current_classroom_id = curr_cr.id
             LEFT JOIN users curr_t ON lr.current_teacher_user_id = curr_t.id
             LEFT JOIN classrooms req_cr ON lr.requested_classroom_id = req_cr.id
             LEFT JOIN users req_t ON lr.requested_teacher_user_id = req_t.id
             ${whereClause}
             ORDER BY lr.created_at DESC`,
            params
        );
        return rows;
    },

    async updateStatus(tenantId, requestId, status, userId, decisionNote = null) {
        const [result] = await pool.query(
            `UPDATE lecture_requests
             SET status = ?,
                 decided_by = ?,
                 decision_note = ?,
                 decided_at = NOW()
             WHERE id = ? AND tenant_id = ? AND status = 'pending'`,
            [status, userId, decisionNote, requestId, tenantId]
        );
        if (result.affectedRows === 0) {
            const err = new Error('Request not found, already acted upon, or access denied.');
            err.statusCode = 404;
            throw err;
        }
        return { id: requestId, status };
    },

    async applyRequest(tenantId, requestId, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT * FROM lecture_requests WHERE id = ? AND tenant_id = ? AND status = 'approved' FOR UPDATE`,
                [requestId, tenantId]
            );

            if (rows.length === 0) {
                await connection.rollback();
                const err = new Error('Request not found, not approved, or already applied.');
                err.statusCode = 404;
                throw err;
            }

            const req = rows[0];

            switch (req.request_type) {
                case 'RESCHEDULE': {
                    const [updateResult] = await connection.query(
                        `UPDATE lectures SET
                            lecture_date = ?,
                            start_time = ?,
                            end_time = ?,
                            is_modified_from_default = 1,
                            updated_by = ?
                         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                        [req.requested_date, req.requested_start_time, req.requested_end_time, userId, req.lecture_id, tenantId]
                    );
                    if (updateResult.affectedRows === 0) {
                        await connection.rollback();
                        const err = new Error('Target lecture not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    await connection.query(
                        `INSERT INTO schedule_change_logs (tenant_id, lecture_id, change_type, old_values, new_values, changed_by)
                         VALUES (?, ?, 'reschedule', ?, ?, ?)`,
                        [
                            tenantId,
                            req.lecture_id,
                            JSON.stringify({ lecture_date: req.current_date, start_time: req.current_start_time, end_time: req.current_end_time }),
                            JSON.stringify({ lecture_date: req.requested_date, start_time: req.requested_start_time, end_time: req.requested_end_time }),
                            userId
                        ]
                    );
                    break;
                }

                case 'ROOM_CHANGE': {
                    const [updateResult] = await connection.query(
                        `UPDATE lectures SET
                            classroom_id = ?,
                            is_modified_from_default = 1,
                            updated_by = ?
                         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                        [req.requested_classroom_id, userId, req.lecture_id, tenantId]
                    );
                    if (updateResult.affectedRows === 0) {
                        await connection.rollback();
                        const err = new Error('Target lecture not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    await connection.query(
                        `INSERT INTO schedule_change_logs (tenant_id, lecture_id, change_type, old_values, new_values, changed_by)
                         VALUES (?, ?, 'room_change', ?, ?, ?)`,
                        [
                            tenantId,
                            req.lecture_id,
                            JSON.stringify({ classroom_id: req.current_classroom_id }),
                            JSON.stringify({ classroom_id: req.requested_classroom_id }),
                            userId
                        ]
                    );
                    break;
                }

                case 'TEACHER_CHANGE': {
                    const [updateResult] = await connection.query(
                        `UPDATE lectures SET
                            teacher_user_id = ?,
                            is_modified_from_default = 1,
                            updated_by = ?
                         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                        [req.requested_teacher_user_id, userId, req.lecture_id, tenantId]
                    );
                    if (updateResult.affectedRows === 0) {
                        await connection.rollback();
                        const err = new Error('Target lecture not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    await connection.query(
                        `INSERT INTO schedule_change_logs (tenant_id, lecture_id, change_type, old_values, new_values, changed_by)
                         VALUES (?, ?, 'teacher_change', ?, ?, ?)`,
                        [
                            tenantId,
                            req.lecture_id,
                            JSON.stringify({ teacher_user_id: req.current_teacher_user_id }),
                            JSON.stringify({ teacher_user_id: req.requested_teacher_user_id }),
                            userId
                        ]
                    );
                    break;
                }

                case 'CANCEL': {
                    const [updateResult] = await connection.query(
                        `UPDATE lectures SET
                            status = 'cancelled',
                            cancellation_reason = ?,
                            updated_by = ?
                         WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                        [req.reason || 'Cancelled via request', userId, req.lecture_id, tenantId]
                    );
                    if (updateResult.affectedRows === 0) {
                        await connection.rollback();
                        const err = new Error('Target lecture not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    await connection.query(
                        `INSERT INTO lecture_cancellations (tenant_id, lecture_id, reason, cancelled_by)
                         VALUES (?, ?, ?, ?)`,
                        [tenantId, req.lecture_id, req.reason || 'Cancelled via request', userId]
                    );
                    await connection.query(
                        `INSERT INTO schedule_change_logs (tenant_id, lecture_id, change_type, old_values, new_values, changed_by)
                         VALUES (?, ?, 'cancel', ?, ?, ?)`,
                        [
                            tenantId,
                            req.lecture_id,
                            JSON.stringify({ status: 'scheduled' }),
                            JSON.stringify({ status: 'cancelled' }),
                            userId
                        ]
                    );
                    break;
                }

                case 'NEW_LECTURE': {
                    const [insResult] = await connection.query(
                        `INSERT INTO lectures (
                            tenant_id, branch_id, academic_year_id, batch_id,
                            subject_id, teacher_user_id, classroom_id,
                            lecture_date, start_time, end_time,
                            lecture_type, activity_type, topic, status,
                            is_active, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 1, ?, ?)`,
                        [
                            tenantId,
                            req.branch_id,
                            1,
                            req.batch_id,
                            req.subject_id,
                            req.requested_teacher_user_id,
                            req.requested_classroom_id,
                            req.requested_date,
                            req.requested_start_time,
                            req.requested_end_time,
                            'Regular',
                            'Lecture',
                            req.reason || null,
                            userId,
                            userId
                        ]
                    );
                    await connection.query(
                        `INSERT INTO schedule_change_logs (tenant_id, lecture_id, change_type, old_values, new_values, changed_by)
                         VALUES (?, ?, 'new_lecture', NULL, ?, ?)`,
                        [
                            tenantId,
                            insResult.insertId,
                            JSON.stringify({
                                lecture_date: req.requested_date,
                                start_time: req.requested_start_time,
                                end_time: req.requested_end_time,
                                teacher_user_id: req.requested_teacher_user_id,
                                classroom_id: req.requested_classroom_id,
                                batch_id: req.batch_id,
                                subject_id: req.subject_id
                            }),
                            userId
                        ]
                    );
                    break;
                }
            }

            await connection.query(
                `UPDATE lecture_requests SET status = 'applied', applied_by = ?, applied_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [userId, requestId, tenantId]
            );

            await connection.commit();
            return { id: requestId, status: 'applied' };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async getStatusCounts(tenantId, filters = {}) {
        let whereClause = 'WHERE tenant_id = ?';
        const params = [tenantId];

        if (filters.branchId) {
            whereClause += ' AND branch_id = ?';
            params.push(filters.branchId);
        }
        if (filters.requesterId) {
            whereClause += ' AND requester_id = ?';
            params.push(filters.requesterId);
        }

        const [rows] = await pool.query(
            `SELECT
                COUNT(*) AS total,
                SUM(status = 'pending') AS pending,
                SUM(status = 'approved') AS approved,
                SUM(status = 'rejected') AS rejected,
                SUM(status = 'cancelled') AS cancelled,
                SUM(status = 'applied') AS applied
             FROM lecture_requests ${whereClause}`,
            params
        );
        return rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, applied: 0 };
    }
};

module.exports = lectureRequestModel;
