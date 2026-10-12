const pool = require('../../config/db');

class AppParentProfileModel {
    /**
     * Get complete parent/guardian profile by User ID with linked children
     */
    async getParentProfileByUserId(tenantId, userId) {
        const parentQuery = `
            SELECT 
                g.id AS guardian_id,
                g.tenant_id,
                g.user_id,
                g.full_name,
                g.relation,
                g.mobile,
                g.email,
                g.occupation,
                g.profile_photo_url,
                g.address,
                g.created_at AS joined_at,
                -- User Account Info
                u.status AS account_status,
                u.last_login_at,
                -- Tenant / School Info
                t.name AS school_name
            FROM guardians g
            INNER JOIN users u ON u.id = g.user_id AND u.deleted_at IS NULL
            LEFT JOIN tenants t ON t.id = g.tenant_id AND t.deleted_at IS NULL
            WHERE g.user_id = ? AND g.tenant_id = ? AND g.deleted_at IS NULL
            LIMIT 1
        `;
        const [parentRows] = await pool.query(parentQuery, [userId, tenantId]);
        if (!parentRows.length) return null;

        const parent = parentRows[0];

        // Fetch all linked children
        const childrenQuery = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name,
                s.dob,
                s.gender,
                s.mobile,
                s.email,
                s.current_class,
                s.target_exam,
                s.blood_group,
                s.profile_photo_url,
                s.status AS student_status,
                sg.is_primary,
                sg.created_at AS linked_at,
                -- Branch
                b.id AS branch_id,
                b.name AS branch_name,
                -- Enrollment & Batch
                se.id AS enrollment_id,
                se.batch_id,
                se.enrolled_date,
                bt.name AS batch_name,
                bt.code AS batch_code
            FROM student_guardians sg
            INNER JOIN students s ON s.id = sg.student_id AND s.deleted_at IS NULL
            LEFT JOIN branches b ON b.id = s.primary_branch_id AND b.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches bt ON bt.id = se.batch_id AND bt.deleted_at IS NULL
            WHERE sg.guardian_id = ? AND sg.tenant_id = ?
            ORDER BY sg.is_primary DESC, s.id ASC
        `;
        const [childrenRows] = await pool.query(childrenQuery, [parent.guardian_id, tenantId]);

        return {
            ...parent,
            children: childrenRows
        };
    }

    /**
     * Update parent contact info and address
     */
    async updateParentContactInfo(tenantId, guardianId, userId, data) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update guardians table
            const guardianFields = [];
            const guardianParams = [];

            if (data.fullName !== undefined) {
                guardianFields.push('full_name = ?');
                guardianParams.push(data.fullName);
            }
            if (data.relation !== undefined) {
                guardianFields.push('relation = ?');
                guardianParams.push(data.relation);
            }
            if (data.occupation !== undefined) {
                guardianFields.push('occupation = ?');
                guardianParams.push(data.occupation);
            }
            if (data.address !== undefined) {
                guardianFields.push('address = ?');
                guardianParams.push(data.address);
            }
            if (data.mobile !== undefined) {
                guardianFields.push('mobile = ?');
                guardianParams.push(data.mobile);
            }
            if (data.email !== undefined) {
                guardianFields.push('email = ?');
                guardianParams.push(data.email);
            }

            if (guardianFields.length > 0) {
                guardianFields.push('updated_at = NOW()');
                const guardianSql = `UPDATE guardians SET ${guardianFields.join(', ')} WHERE id = ? AND tenant_id = ?`;
                guardianParams.push(guardianId, tenantId);
                await connection.execute(guardianSql, guardianParams);
            }

            // 2. Sync email, mobile, and name to users table if updated
            const userFields = [];
            const userParams = [];

            if (data.fullName !== undefined) {
                userFields.push('name = ?');
                userParams.push(data.fullName);
            }
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
     * Update Parent Profile Photo URL
     */
    async updateProfilePhoto(tenantId, guardianId, photoUrl) {
        const query = `UPDATE guardians SET profile_photo_url = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`;
        await pool.execute(query, [photoUrl, guardianId, tenantId]);
    }
}

module.exports = new AppParentProfileModel();
