const pool = require('../config/db');

const getAll = async (limit = 10, offset = 0, search = '', category = '', status = '') => {
    let query = `SELECT id, tenant_id, template_key, name, description, category, subject, html_body, text_body, variables, status, is_system, created_by, updated_by, created_at, updated_at FROM email_templates WHERE deleted_at IS NULL`;
    const params = [];

    if (search) {
        query += ` AND (name LIKE ? OR template_key LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
};

const getTotalCount = async (search = '', category = '', status = '') => {
    let query = `SELECT COUNT(*) as total FROM email_templates WHERE deleted_at IS NULL`;
    const params = [];

    if (search) {
        query += ` AND (name LIKE ? OR template_key LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    const [rows] = await pool.query(query, params);
    return rows[0].total;
};

const getCategories = async () => {
    const [rows] = await pool.query(`SELECT DISTINCT category FROM email_templates WHERE deleted_at IS NULL AND category IS NOT NULL AND category != ''`);
    return rows.map(r => r.category).filter(Boolean);
};

const getById = async (id) => {
    const query = `SELECT id, tenant_id, template_key, name, description, category, subject, html_body, text_body, variables, status, is_system, created_by, updated_by, created_at, updated_at FROM email_templates WHERE id = ? AND deleted_at IS NULL`;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
};

const getByTemplateKey = async (templateKey, tenantId = 1) => {
    const query = `SELECT id FROM email_templates WHERE template_key = ? AND tenant_id = ? AND deleted_at IS NULL`;
    const [rows] = await pool.query(query, [templateKey, tenantId]);
    return rows[0] || null;
};

const create = async (data) => {
    const query = `
        INSERT INTO email_templates (
            tenant_id, template_key, name, description, category,
            subject, html_body, text_body, variables,
            status, is_system, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `;
    const params = [
        data.tenant_id || 1,
        data.template_key,
        data.name,
        data.description || null,
        data.category,
        data.subject,
        data.html_body,
        data.text_body || null,
        data.variables ? JSON.stringify(data.variables) : null,
        data.status || 'ACTIVE',
        data.created_by || null,
        data.updated_by || null
    ];

    const [result] = await pool.query(query, params);
    return result.insertId;
};

const update = async (id, data) => {
    let query = `UPDATE email_templates SET updated_at = CURRENT_TIMESTAMP`;
    const params = [];

    const fieldMap = {
        name: 'name',
        description: 'description',
        category: 'category',
        subject: 'subject',
        html_body: 'html_body',
        text_body: 'text_body',
        status: 'status',
        updated_by: 'updated_by'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            query += `, ${dbField} = ?`;
            params.push(data[key]);
        }
    }

    if (data.variables !== undefined) {
        query += `, variables = ?`;
        params.push(data.variables ? JSON.stringify(data.variables) : null);
    }

    query += ` WHERE id = ? AND deleted_at IS NULL`;
    params.push(id);

    const [result] = await pool.query(query, params);
    return result.affectedRows > 0;
};

const updateStatus = async (id, status) => {
    const query = `UPDATE email_templates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`;
    const [result] = await pool.query(query, [status, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAll,
    getTotalCount,
    getCategories,
    getById,
    getByTemplateKey,
    create,
    update,
    updateStatus
};
