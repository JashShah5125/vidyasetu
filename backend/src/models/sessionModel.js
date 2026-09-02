const pool = require('../config/db');

const createSession = async ({ userId, tenantId, refreshTokenHash, ipAddress, userAgent, expiresAt }) => {
    const [result] = await pool.query(
        `INSERT INTO user_sessions
            (user_id, tenant_id, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, tenantId, refreshTokenHash, ipAddress, userAgent, expiresAt]
    );
    return result.insertId;
};

const findByTokenHash = async (refreshTokenHash) => {
    const [rows] = await pool.query(
        'SELECT * FROM user_sessions WHERE refresh_token_hash = ? ORDER BY id DESC LIMIT 1',
        [refreshTokenHash]
    );
    return rows[0] || null;
};

const revokeByTokenHash = async (refreshTokenHash) => {
    const [result] = await pool.query(
        'UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE refresh_token_hash = ? AND revoked_at IS NULL',
        [refreshTokenHash]
    );
    return result.affectedRows > 0;
};

module.exports = {
    createSession,
    findByTokenHash,
    revokeByTokenHash
};