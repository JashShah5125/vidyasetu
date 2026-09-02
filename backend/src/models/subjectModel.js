const pool = require('../config/db');

// Base SELECT clause for subjects
const SUBJECT_SELECT = `
    SELECT DISTINCT
        s.id, 
        s.name, 
        s.code, 
        s.type,
        s.description, 
        s.status,
        s.created_at, 
        s.updated_at
    FROM subjects s
`;

const getSubjects = async (tenantId, { search = '', status = 'all', courseId, programId, levelId, limit = 10, offset = 0 } = {}) => {
    let where = `s.tenant_id = ? AND s.deleted_at IS NULL`;
    const params = [tenantId];
    
    let joinClause = '';
    if (courseId || programId || levelId) {
        joinClause = `
            JOIN level_subjects ls ON ls.subject_id = s.id
            JOIN levels l ON l.id = ls.level_id
        `;
        if (levelId) {
            where += ` AND l.id = ?`;
            params.push(levelId);
        } else if (programId) {
            where += ` AND l.program_id = ?`;
            params.push(programId);
        } else if (courseId) {
            where += ` AND l.course_id = ?`;
            params.push(courseId);
        }
    }

    if (search) {
        where += ` AND (s.name LIKE ? OR s.code LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }
    
    if (status === 'active') {
        where += ` AND s.status = 'active'`;
    } else if (status === 'inactive') {
        where += ` AND s.status = 'inactive'`;
    } else if (status === 'deleted') {
        where += ` AND s.status = 'deleted'`;
    }

    const [rows] = await pool.query(
        `${SUBJECT_SELECT} ${joinClause} WHERE ${where} ORDER BY s.name ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(DISTINCT s.id) AS total FROM subjects s ${joinClause} WHERE ${where}`,
        params
    );

    const data = rows.map(row => ({
        ...row,
        id: String(row.id)
    }));

    return { data, total: countRows[0].total };
};

const getSubjectByCode = async (tenantId, code) => {
    const [rows] = await pool.query(
        `${SUBJECT_SELECT} WHERE s.code = ? AND s.tenant_id = ? AND s.deleted_at IS NULL`,
        [code, tenantId]
    );
    
    if (rows.length === 0) return null;
    
    const subject = rows[0];
    return {
        ...subject,
        id: String(subject.id)
    };
};

const createSubject = async (tenantId, data, userId) => {
    const { name, code, type = 'core', description = '', status = 'active' } = data;

    const [result] = await pool.query(
        `INSERT INTO subjects (tenant_id, name, code, type, description, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, name, code, type, description, status, userId, userId]
    );

    return { id: String(result.insertId) };
};

const updateSubject = async (tenantId, code, data, userId) => {
    const { name, type = 'core', description = '', status } = data;

    // Check if subject exists
    const existing = await getSubjectByCode(tenantId, code);
    if (!existing) return null;

    let updateFields = 'name = ?, type = ?, description = ?, updated_by = ?';
    const params = [name, type, description, userId];

    if (status !== undefined) {
        updateFields += ', status = ?';
        params.push(status);
    }

    params.push(code, tenantId);

    const [result] = await pool.query(
        `UPDATE subjects SET ${updateFields} WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL`,
        params
    );

    return result.affectedRows > 0 ? { code } : null;
};

const deleteSubject = async (tenantId, code, userId) => {
    const [result] = await pool.query(
        `UPDATE subjects 
         SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted', updated_by = ? 
         WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [userId, code, tenantId]
    );

    return result.affectedRows > 0;
};

module.exports = {
    getSubjects,
    getSubjectByCode,
    createSubject,
    updateSubject,
    deleteSubject
};
