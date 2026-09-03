const pool = require('../config/db');

const getById = async (id) => {
    const query = `SELECT id, tenant_id, channel_type, provider_name, is_enabled, credentials, sender_id, created_at, updated_at, updated_by FROM system_configurations WHERE id = ?`;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
};

const getByTenantAndChannel = async (tenantId, channelType) => {
    const query = `SELECT id, tenant_id, channel_type, provider_name, is_enabled, credentials, sender_id, created_at, updated_at, updated_by FROM system_configurations WHERE tenant_id = ? AND channel_type = ?`;
    const [rows] = await pool.query(query, [tenantId, channelType]);
    return rows[0] || null;
};

const getAllByTenant = async (tenantId) => {
    const query = `SELECT id, tenant_id, channel_type, provider_name, is_enabled, credentials, sender_id, created_at, updated_at, updated_by FROM system_configurations WHERE tenant_id = ?`;
    const [rows] = await pool.query(query, [tenantId]);
    return rows;
};

const getProvidersByChannel = async (tenantId, channelType) => {
    const query = `SELECT DISTINCT provider_name FROM system_configurations WHERE tenant_id = ? AND channel_type = ? ORDER BY provider_name ASC`;
    const [rows] = await pool.query(query, [tenantId, channelType]);
    return rows.map(r => r.provider_name);
};

const create = async (data) => {
    const query = `
        INSERT INTO system_configurations (tenant_id, channel_type, provider_name, is_enabled, credentials, sender_id, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        data.tenant_id,
        data.channel_type,
        data.provider_name,
        data.is_enabled === undefined ? false : data.is_enabled,
        JSON.stringify(data.credentials || {}),
        data.sender_id || null,
        data.updated_by || null
    ];
    const [result] = await pool.query(query, params);
    return result.insertId;
};

const update = async (id, data) => {
    let query = `UPDATE system_configurations SET updated_at = CURRENT_TIMESTAMP`;
    const params = [];

    if (data.provider_name !== undefined) {
        query += `, provider_name = ?`;
        params.push(data.provider_name);
    }

    if (data.is_enabled !== undefined) {
        query += `, is_enabled = ?`;
        params.push(data.is_enabled);
    }

    if (data.credentials !== undefined) {
        query += `, credentials = ?`;
        params.push(JSON.stringify(data.credentials));
    }

    if (data.sender_id !== undefined) {
        query += `, sender_id = ?`;
        params.push(data.sender_id);
    }

    if (data.updated_by !== undefined) {
        query += `, updated_by = ?`;
        params.push(data.updated_by);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    const [result] = await pool.query(query, params);
    return result.affectedRows > 0;
};

const updateIsEnabled = async (id, isEnabled, updatedBy) => {
    const query = `UPDATE system_configurations SET is_enabled = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await pool.query(query, [isEnabled, updatedBy || null, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getById,
    getByTenantAndChannel,
    getAllByTenant,
    getProvidersByChannel,
    create,
    update,
    updateIsEnabled
};
