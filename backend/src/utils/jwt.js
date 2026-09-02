const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token is short-lived

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Refresh sessions live 7 days (matches JWT_REFRESH_EXPIRES_IN and user_sessions.expires_at)
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};

// Refresh tokens are large JWTs (~500 chars) and cannot fit in user_sessions
// refresh_token_hash VARCHAR(255), so they are persisted as SHA-256 hex digests.
const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
    REFRESH_TTL_SECONDS
};
