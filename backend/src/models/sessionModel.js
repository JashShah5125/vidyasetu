const pool = require('../config/db');

const createSession = async ({ sessionId, userId, tenantId, refreshTokenHash, ipAddress, userAgent, expiresAt }) => {
    const [result] = await pool.query(
        `INSERT INTO user_sessions (session_id, user_id, tenant_id, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, tenantId, refreshTokenHash, ipAddress || null, userAgent || null, expiresAt]
    );
    return result.insertId;
};

const findActiveBySessionId = async (sessionId, userId) => {
    const [rows] = await pool.query(
        `SELECT * FROM user_sessions
         WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
        [sessionId, userId]
    );
    return rows[0];
};

const findActiveByTokenHash = async (tokenHash, userId) => {
    const [rows] = await pool.query(
        `SELECT * FROM user_sessions
         WHERE refresh_token_hash = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
        [tokenHash, userId]
    );
    return rows[0];
};

const revokeBySessionId = async (sessionId, userId) => {
    const [result] = await pool.query(
        `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL`,
        [sessionId, userId]
    );
    return result.affectedRows > 0;
};

module.exports = {
    createSession,
    findActiveBySessionId,
    findActiveByTokenHash,
    revokeBySessionId
};
