const pool = require('../../config/db');

class AppProfileModel {
    /**
     * Get complete student profile by authenticated User ID
     */
    async getStudentProfileByUserId(tenantId, userId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.tenant_id,
                s.user_id,
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
                s.year_of_attempt,
                s.blood_group,
                s.profile_photo_url,
                s.status AS student_status,
                s.account_type,
                s.created_at AS joined_at,
                -- User Account Info
                u.status AS account_status,
                u.last_login_at,
                -- Branch Info
                b.id AS branch_id,
                b.name AS branch_name,
                b.code AS branch_code,
                b.city AS branch_city,
                -- Active Batch & Enrollment Info
                se.id AS enrollment_id,
                se.batch_id,
                se.enrolled_date,
                bt.name AS batch_name,
                bt.code AS batch_code,
                -- Board Info
                bd.name AS board_name
            FROM students s
            INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
            LEFT JOIN branches b ON b.id = s.primary_branch_id AND b.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches bt ON bt.id = se.batch_id AND bt.deleted_at IS NULL
            LEFT JOIN boards bd ON bd.id = s.board_id AND bd.deleted_at IS NULL
            WHERE s.user_id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Update allowed contact and demographic fields
     */
    async updateStudentContactInfo(tenantId, studentId, userId, data) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update students table
            const studentFields = [];
            const studentParams = [];

            if (data.street !== undefined) {
                studentFields.push('street = ?');
                studentParams.push(data.street);
            }
            if (data.city !== undefined) {
                studentFields.push('city = ?');
                studentParams.push(data.city);
            }
            if (data.state !== undefined) {
                studentFields.push('state = ?');
                studentParams.push(data.state);
            }
            if (data.pincode !== undefined) {
                studentFields.push('pincode = ?');
                studentParams.push(data.pincode);
            }
            if (data.bloodGroup !== undefined) {
                studentFields.push('blood_group = ?');
                studentParams.push(data.bloodGroup);
            }
            if (data.mobile !== undefined) {
                studentFields.push('mobile = ?');
                studentParams.push(data.mobile);
            }
            if (data.email !== undefined) {
                studentFields.push('email = ?');
                studentParams.push(data.email);
            }

            if (studentFields.length > 0) {
                studentFields.push('updated_at = NOW()');
                const studentSql = `UPDATE students SET ${studentFields.join(', ')} WHERE id = ? AND tenant_id = ?`;
                studentParams.push(studentId, tenantId);
                await connection.execute(studentSql, studentParams);
            }

            // 2. Sync email and mobile to users table if updated
            const userFields = [];
            const userParams = [];

            if (data.email !== undefined) {
                userFields.push('email = ?');
                userParams.push(data.email);
            }
            if (data.mobile !== undefined) {
                userFields.push('mobile = ?');
                userParams.push(data.mobile);
            }

            if (userFields.length > 0) {
                userFields.push('updated_at = NOW()');
                const userSql = `UPDATE users SET ${userFields.join(', ')} WHERE id = ? AND tenant_id = ?`;
                userParams.push(userId, tenantId);
                await connection.execute(userSql, userParams);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Check if email is in use by another user
     */
    async isEmailInUseByOther(email, currentUserId) {
        const query = `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? AND deleted_at IS NULL LIMIT 1`;
        const [rows] = await pool.query(query, [email, currentUserId]);
        return rows.length > 0;
    }

    /**
     * Update Profile Photo URL
     */
    async updateProfilePhoto(tenantId, studentId, photoUrl) {
        const query = `UPDATE students SET profile_photo_url = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`;
        await pool.execute(query, [photoUrl, studentId, tenantId]);
    }

    /**
     * Get parent/guardians associated with this student
     */
    async getGuardiansByStudentId(tenantId, studentId) {
        const query = `
            SELECT 
                g.id AS guardian_id,
                g.full_name,
                g.relation,
                g.mobile,
                g.email,
                g.occupation,
                sg.is_primary,
                sg.created_at AS linked_at
            FROM student_guardians sg
            INNER JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL
            WHERE sg.student_id = ? AND sg.tenant_id = ?
            ORDER BY sg.is_primary DESC, g.created_at ASC
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows;
    }

    /**
     * Get uploaded documents & verification status
     */
    async getDocumentsByStudentId(tenantId, studentId) {
        const query = `
            SELECT 
                sd.id AS document_id,
                sd.document_type_id,
                dt.name AS document_type_name,
                dt.code AS document_type_code,
                sd.file_name,
                sd.storage_key AS file_url,
                sd.mime_type,
                sd.status AS verification_status,
                sd.rejection_reason,
                sd.verified_at,
                sd.created_at AS uploaded_at
            FROM student_documents sd
            LEFT JOIN document_types dt ON dt.id = sd.document_type_id AND dt.deleted_at IS NULL
            WHERE sd.student_id = ? AND sd.tenant_id = ? AND sd.deleted_at IS NULL
            ORDER BY sd.created_at DESC
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows;
    }
}

module.exports = new AppProfileModel();
