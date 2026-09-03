const pool = require('../config/db');

const getSettings = async ({ limit = 10, offset = 0, search = '', category = 'general', status = '' }) => {
    let query = `
        SELECT *
        FROM platform_settings
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (key_name LIKE ? OR value LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
    }

    if (category && category !== 'ALL') {
        query += ` AND category = ?`;
        params.push(category);
    }

    if (status && status.toLowerCase() === 'deleted') {
        query += ` AND deleted_at IS NOT NULL`;
    } else {
        query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = `
        SELECT COUNT(*) as total 
        FROM platform_settings
        WHERE 1=1
    `;
    const countParams = [];

    if (search) {
        countQuery += ` AND (key_name LIKE ? OR value LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern);
    }

    if (category && category !== 'ALL') {
        countQuery += ` AND category = ?`;
        countParams.push(category);
    }

    if (status && status.toLowerCase() === 'deleted') {
        countQuery += ` AND deleted_at IS NOT NULL`;
    } else {
        countQuery += ` AND deleted_at IS NULL`;
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const getSettingById = async (id) => {
    const [rows] = await pool.query(`SELECT * FROM platform_settings WHERE id = ?`, [id]);
    return rows[0] || null;
};

const createSetting = async (data) => {
    const {
        category = 'general',
        key_name,
        value,
        is_secret = 0,
        created_by = null
    } = data;

    const formattedKey = key_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const [result] = await pool.query(`
        INSERT INTO platform_settings (category, key_name, value, is_secret, updated_by)
        VALUES (?, ?, ?, ?, ?)
    `, [category, formattedKey, value, is_secret ? 1 : 0, created_by]);

    return getSettingById(result.insertId);
};

const updateSetting = async (id, data) => {
    const {
        key_name,
        value,
        is_secret,
        category,
        updated_by = null
    } = data;

    const formattedKey = key_name ? key_name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : undefined;

    await pool.query(`
        UPDATE platform_settings
        SET key_name = COALESCE(?, key_name),
            value = COALESCE(?, value),
            is_secret = COALESCE(?, is_secret),
            category = COALESCE(?, category),
            updated_by = ?,
            updated_at = NOW()
        WHERE id = ?
    `, [formattedKey, value, is_secret !== undefined ? (is_secret ? 1 : 0) : undefined, category, updated_by, id]);

    return getSettingById(id);
};

const deleteSetting = async (id) => {
    const [result] = await pool.query(`
        UPDATE platform_settings 
        SET deleted_at = NOW() 
        WHERE id = ?
    `, [id]);
    return result.affectedRows > 0;
};

module.exports = {
    getSettings,
    getSettingById,
    createSetting,
    updateSetting,
    deleteSetting
};
