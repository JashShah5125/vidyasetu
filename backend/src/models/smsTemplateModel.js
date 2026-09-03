const pool = require('../config/db');

const getSmsTemplates = async ({ limit = 10, offset = 0, search = '', category = '', status = '' }) => {
    let query = `
        SELECT t.*
        FROM sms_templates t
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (t.template_name LIKE ? OR t.dlt_template_id LIKE ? OR t.message_body LIKE ? OR t.template_key LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && category !== 'ALL') {
        query += ` AND t.category = ?`;
        params.push(category);
    }

    if (status && status !== 'ALL') {
        query += ` AND t.status = ?`;
        params.push(status.toLowerCase());
    } else {
        query += ` AND t.status != 'deleted'`;
    }

    query += ` ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    const parsedRows = rows.map(r => ({
        ...r,
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : r.variables
    }));

    let countQuery = `
        SELECT COUNT(*) as total 
        FROM sms_templates t
        WHERE 1=1
    `;
    const countParams = [];

    if (search) {
        countQuery += ` AND (t.template_name LIKE ? OR t.dlt_template_id LIKE ? OR t.message_body LIKE ? OR t.template_key LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && category !== 'ALL') {
        countQuery += ` AND t.category = ?`;
        countParams.push(category);
    }

    if (status && status !== 'ALL') {
        countQuery += ` AND t.status = ?`;
        countParams.push(status.toLowerCase());
    } else {
        countQuery += ` AND t.status != 'deleted'`;
    }

    const [countRows] = await pool.query(countQuery, countParams);

    const [categoryRows] = await pool.query(`SELECT DISTINCT category FROM sms_templates WHERE status != 'deleted'`);

    return {
        data: parsedRows,
        total: countRows[0].total,
        categories: categoryRows.map(r => r.category).filter(Boolean)
    };
};

const getSmsTemplateById = async (id) => {
    const [rows] = await pool.query(`SELECT * FROM sms_templates WHERE id = ?`, [id]);
    if (!rows[0]) return null;
    return {
        ...rows[0],
        variables: typeof rows[0].variables === 'string' ? JSON.parse(rows[0].variables) : rows[0].variables
    };
};

const createSmsTemplate = async (data) => {
    const {
        tenant_id = 1,
        template_name,
        template_key,
        category = 'General',
        dlt_template_id,
        message_body,
        variables = null,
        status = 'active',
        created_by = null
    } = data;

    const generatedKey = template_key || template_name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const jsonVars = variables ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : null;

    const [result] = await pool.query(`
        INSERT INTO sms_templates (tenant_id, template_name, template_key, category, dlt_template_id, message_body, variables, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tenant_id, template_name, generatedKey, category, dlt_template_id, message_body, jsonVars, status, created_by]);

    return getSmsTemplateById(result.insertId);
};

const updateSmsTemplate = async (id, data) => {
    const {
        template_name,
        category,
        dlt_template_id,
        message_body,
        variables,
        status,
        updated_by = null
    } = data;

    const jsonVars = variables !== undefined ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : undefined;

    await pool.query(`
        UPDATE sms_templates
        SET template_name = COALESCE(?, template_name),
            category = COALESCE(?, category),
            dlt_template_id = COALESCE(?, dlt_template_id),
            message_body = COALESCE(?, message_body),
            variables = COALESCE(?, variables),
            status = COALESCE(?, status),
            updated_by = ?,
            updated_at = NOW()
        WHERE id = ?
    `, [template_name, category, dlt_template_id, message_body, jsonVars, status, updated_by, id]);

    return getSmsTemplateById(id);
};

const deleteSmsTemplate = async (id) => {
    const [result] = await pool.query(`
        UPDATE sms_templates 
        SET status = 'deleted', 
            deleted_at = NOW() 
        WHERE id = ?
    `, [id]);
    return result.affectedRows > 0;
};

module.exports = {
    getSmsTemplates,
    getSmsTemplateById,
    createSmsTemplate,
    updateSmsTemplate,
    deleteSmsTemplate
};
