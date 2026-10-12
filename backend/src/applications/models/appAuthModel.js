const pool = require('../../config/db');

class AppAuthModel {
    /**
     * Find a student user by student code, email, or mobile number
     */
    async findStudentUserByLoginIdentifier(identifier) {
        const query = `
            SELECT 
                u.id AS user_id,
                u.tenant_id,
                u.name,
                u.email,
                u.mobile,
                u.password_hash,
                u.user_type,
                u.status AS user_status,
                u.app_access_suspended,
                u.must_change_password,
                s.id AS student_id,
                s.student_code,
                s.full_name,
                s.primary_branch_id,
                s.profile_photo_url,
                s.status AS student_status,
                se.id AS enrollment_id,
                se.batch_id,
                se.academic_year_id,
                se.app_access_enabled,
                b.name AS batch_name,
                br.name AS branch_name
            FROM users u
            INNER JOIN students s ON s.user_id = u.id AND s.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            LEFT JOIN branches br ON br.id = s.primary_branch_id AND br.deleted_at IS NULL
            WHERE (
                LOWER(u.email) = LOWER(?)
                OR u.mobile = ?
                OR LOWER(s.student_code) = LOWER(?)
            )
            AND u.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [identifier, identifier, identifier]);
        return rows[0] || null;
    }

    /**
     * Find a parent user by email or mobile number
     */
    async findParentUserByLoginIdentifier(identifier) {
        const query = `
            SELECT 
                u.id AS user_id,
                u.tenant_id,
                u.name,
                u.email,
                u.mobile,
                u.password_hash,
                u.user_type,
                u.status AS user_status,
                u.app_access_suspended,
                u.must_change_password,
                g.id AS guardian_id,
                g.full_name AS guardian_name,
                g.relation,
                g.occupation,
                g.profile_photo_url,
                g.address,
                t.name AS school_name
            FROM users u
            INNER JOIN guardians g ON g.user_id = u.id AND g.deleted_at IS NULL
            LEFT JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL
            WHERE (
                LOWER(u.email) = LOWER(?)
                OR u.mobile = ?
            )
            AND u.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [identifier, identifier]);
        return rows[0] || null;
    }

    /**
     * Get children linked to a guardian
     */
    async getLinkedChildrenByGuardianId(tenantId, guardianId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name,
                s.current_class,
                s.profile_photo_url,
                sg.is_primary,
                b.name AS branch_name,
                bt.name AS batch_name
            FROM student_guardians sg
            INNER JOIN students s ON s.id = sg.student_id AND s.deleted_at IS NULL
            LEFT JOIN branches b ON b.id = s.primary_branch_id AND b.deleted_at IS NULL
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches bt ON bt.id = se.batch_id AND bt.deleted_at IS NULL
            WHERE sg.guardian_id = ? AND sg.tenant_id = ?
            ORDER BY sg.is_primary DESC, s.id ASC
        `;
        const [rows] = await pool.query(query, [guardianId, tenantId]);
        return rows;
    }

    /**
     * Find user by primary user ID
     */
    async findUserById(userId) {
        const query = `
            SELECT 
                u.id AS user_id,
                u.tenant_id,
                u.name,
                u.email,
                u.mobile,
                u.password_hash,
                u.user_type,
                u.status,
                u.app_access_suspended,
                u.must_change_password
            FROM users u
            WHERE u.id = ? AND u.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows[0] || null;
    }

    /**
     * Update password hash & reset must_change_password flag
     */
    async updatePassword(userId, passwordHash) {
        const query = `
            UPDATE users 
            SET password_hash = ?, 
                must_change_password = 0, 
                updated_at = NOW() 
            WHERE id = ?
        `;
        await pool.execute(query, [passwordHash, userId]);
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId) {
        const query = `UPDATE users SET last_login_at = NOW() WHERE id = ?`;
        await pool.execute(query, [userId]);
    }

    /**
     * Create session record in user_sessions (id is auto-increment)
     */
    async createSession({ userId, tenantId, refreshTokenHash, deviceId = null, ipAddress = null, userAgent = null, expiresAt }) {
        const query = `
            INSERT INTO user_sessions (
                user_id, tenant_id, refresh_token_hash, device_id, ip_address, user_agent, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            userId, tenantId, refreshTokenHash, deviceId, ipAddress, userAgent, expiresAt
        ]);
        return result.insertId;
    }

    /**
     * Find session by hashed refresh token
     */
    async findSessionByHash(refreshTokenHash) {
        const query = `
            SELECT * FROM user_sessions 
            WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [refreshTokenHash]);
        return rows[0] || null;
    }

    /**
     * Revoke session by refresh token hash or user session ID
     */
    async revokeSession(refreshTokenHash) {
        const query = `
            UPDATE user_sessions 
            SET revoked_at = NOW() 
            WHERE refresh_token_hash = ? AND revoked_at IS NULL
        `;
        await pool.execute(query, [refreshTokenHash]);
    }

    /**
     * Revoke all sessions for a user
     */
    async revokeAllUserSessions(userId) {
        const query = `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`;
        await pool.execute(query, [userId]);
    }

    /**
     * Create OTP code entry (id is auto-increment)
     */
    async createOtp({ userId, mobile, codeHash, purpose, expiresAt }) {
        // Invalidate prior unused OTPs for same mobile and purpose
        await pool.execute(
            `UPDATE otp_codes SET used_at = NOW() WHERE mobile = ? AND purpose = ? AND used_at IS NULL`,
            [mobile, purpose]
        );

        const query = `
            INSERT INTO otp_codes (
                user_id, mobile, code_hash, purpose, expires_at, attempt_count
            ) VALUES (?, ?, ?, ?, ?, 0)
        `;
        const [result] = await pool.execute(query, [userId, mobile, codeHash, purpose, expiresAt]);
        return result.insertId;
    }

    /**
     * Find active OTP for mobile and purpose
     */
    async findActiveOtp(mobile, purpose) {
        const query = `
            SELECT * FROM otp_codes 
            WHERE mobile = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [mobile, purpose]);
        return rows[0] || null;
    }

    /**
     * Mark OTP as used
     */
    async markOtpUsed(otpId) {
        const query = `UPDATE otp_codes SET used_at = NOW() WHERE id = ?`;
        await pool.execute(query, [otpId]);
    }

    /**
     * Increment OTP attempt count
     */
    async incrementOtpAttempt(otpId) {
        const query = `UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = ?`;
        await pool.execute(query, [otpId]);
    }

    /**
     * Upsert Device record (id is auto-increment)
     */
    async upsertAppDevice({ tenantId, userId, deviceName, osType, osVersion, appVersion, deviceIdentifier }) {
        const query = `
            INSERT INTO app_devices (
                tenant_id, user_id, device_name, os_type, os_version, app_version, device_identifier, last_active_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                device_name = VALUES(device_name),
                os_type = VALUES(os_type),
                os_version = VALUES(os_version),
                app_version = VALUES(app_version),
                last_active_at = NOW()
        `;
        await pool.execute(query, [
            tenantId, userId, deviceName, osType, osVersion, appVersion, deviceIdentifier
        ]);

        const [rows] = await pool.query(`SELECT id FROM app_devices WHERE device_identifier = ? LIMIT 1`, [deviceIdentifier]);
        return rows[0]?.id || null;
    }

    /**
     * Upsert Push Notification FCM Token (id is auto-increment)
     */
    async upsertPushToken({ tenantId, userId, deviceId, fcmToken }) {
        const query = `
            INSERT INTO push_tokens (
                tenant_id, user_id, device_id, fcm_token, is_active, updated_at
            ) VALUES (?, ?, ?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                device_id = VALUES(device_id),
                is_active = 1,
                updated_at = NOW()
        `;
        await pool.execute(query, [tenantId, userId, deviceId, fcmToken]);
    }

    /**
     * Deactivate Push Token (on logout)
     */
    async deactivatePushToken(userId, fcmToken = null, deviceId = null) {
        let query = `UPDATE push_tokens SET is_active = 0, updated_at = NOW() WHERE user_id = ?`;
        const params = [userId];

        if (fcmToken) {
            query += ` AND fcm_token = ?`;
            params.push(fcmToken);
        } else if (deviceId) {
            query += ` AND device_id = ?`;
            params.push(deviceId);
        }

        await pool.execute(query, params);
    }
}

module.exports = new AppAuthModel();
