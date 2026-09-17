const pool = require('../config/db');

const LEAD_SELECT = `
    SELECT sl.*,
           sp.name AS plan_name,
           u.name AS assigned_to_name
    FROM saas_leads sl
    LEFT JOIN subscription_plans sp ON sl.plan_id = sp.id
    LEFT JOIN users u ON sl.assigned_to = u.id
`;

const mapFollowup = (row) => ({
    id: row.id,
    leadId: row.lead_id,
    followupMode: row.followup_mode,
    outcome: row.outcome,
    notes: row.notes || null,
    nextFollowupAt: row.next_followup_at,
    createdAt: row.created_at,
    createdBy: row.created_by
});

const mapLead = (row, followups = null) => ({
    id: row.id,
    instituteName: row.institute_name,
    contactPerson: row.contact_person,
    designation: row.designation || null,
    email: row.email || null,
    mobile: row.mobile,
    altMobile: row.alt_mobile || null,
    addressLine1: row.address_line1 || null,
    city: row.city || null,
    state: row.state || null,
    pincode: row.pincode || null,
    source: row.source,
    assignedTo: row.assigned_to || null,
    assignedToName: row.assigned_to_name || null,
    status: row.status,
    lostReason: row.lost_reason || null,
    planAssignedAt: row.plan_assigned_at || null,
    nextFollowupAt: row.next_followup_at || null,
    planId: row.plan_id || null,
    planName: row.plan_name || null,
    preferredSlug: row.preferred_slug || null,
    remarks: row.remarks || null,
    convertedTenantId: row.converted_tenant_id || null,
    convertedAt: row.converted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    followups
});

const normalizeStatus = (val) => {
    if (val === undefined || val === null || val === '' || val === 'All' || val === 'all') return null;
    const n = Number(val);
    return Number.isInteger(n) ? n : null;
};

const getLeads = async ({ limit = 10, offset = 0, search = '', status = '', source = '', planId = '', assignedTo = '' } = {}) => {
    let query = `${LEAD_SELECT} WHERE sl.deleted_at IS NULL`;
    const params = [];

    if (search && String(search).trim()) {
        query += ` AND (sl.institute_name LIKE ? OR sl.contact_person LIKE ? OR sl.email LIKE ? OR sl.mobile LIKE ?)`;
        const pattern = `%${String(search).trim()}%`;
        params.push(pattern, pattern, pattern, pattern);
    }

    const normStatus = normalizeStatus(status);
    if (normStatus !== null) {
        query += ` AND sl.status = ?`;
        params.push(normStatus);
    }

    if (source !== '' && source !== 'All') {
        const src = Number(source);
        if (Number.isInteger(src)) {
            query += ` AND sl.source = ?`;
            params.push(src);
        }
    }

    if (planId && planId !== 'All') {
        query += ` AND sl.plan_id = ?`;
        params.push(Number(planId));
    }

    if (assignedTo && assignedTo !== 'All') {
        query += ` AND sl.assigned_to = ?`;
        params.push(Number(assignedTo));
    }

    const countQuery = query;
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM (${countQuery}) AS lead_count`, params
    );
    const total = countRows[0].total;

    query += ` ORDER BY sl.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    const [statusRows] = await pool.query(
        `SELECT DISTINCT status FROM saas_leads WHERE deleted_at IS NULL`
    );

    return {
        data: rows.map(r => mapLead(r)),
        total,
        available_statuses: statusRows.map(r => r.status)
    };
};

const getLeadById = async (id) => {
    const [rows] = await pool.query(`${LEAD_SELECT} WHERE sl.id = ?`, [id]);
    if (rows.length === 0) return null;

    const [followups] = await pool.query(
        `SELECT * FROM saas_lead_followups WHERE lead_id = ? ORDER BY created_at ASC, id ASC`,
        [id]
    );

    return mapLead(rows[0], followups.map(mapFollowup));
};

const createLead = async (data, createdBy = null) => {
    const {
        instituteName, contactPerson, designation = null, email = null, mobile, altMobile = null,
        addressLine1 = null, city = null, state = null, pincode = null,
        source = 1, assignedTo = null, status = 1, lostReason = null,
        nextFollowupAt = null, planId = null, preferredSlug = null, remarks = null
    } = data;

    const statusNum = Number(status) || 1;
    const planAssignedAt = statusNum === 4 && planId ? new Date() : null;

    const [result] = await pool.query(
        `INSERT INTO saas_leads (
            institute_name, contact_person, designation, email, mobile, alt_mobile,
            address_line1, city, state, pincode, source, assigned_to, status, lost_reason,
            plan_assigned_at, next_followup_at, plan_id, preferred_slug, remarks, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            instituteName, contactPerson, designation, email, mobile, altMobile,
            addressLine1, city, state, pincode, Number(source) || 1, assignedTo || null, statusNum, lostReason,
            planAssignedAt, nextFollowupAt, planId || null, preferredSlug, remarks, createdBy
        ]
    );

    return getLeadById(result.insertId);
};

const updateLead = async (id, data, updatedBy = null) => {
    const fieldMap = {
        instituteName: 'institute_name',
        contactPerson: 'contact_person',
        designation: 'designation',
        email: 'email',
        mobile: 'mobile',
        altMobile: 'alt_mobile',
        addressLine1: 'address_line1',
        city: 'city',
        state: 'state',
        pincode: 'pincode',
        source: 'source',
        assignedTo: 'assigned_to',
        status: 'status',
        lostReason: 'lost_reason',
        nextFollowupAt: 'next_followup_at',
        planId: 'plan_id',
        preferredSlug: 'preferred_slug',
        remarks: 'remarks'
    };

    const fields = [];
    const params = [];

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            fields.push(`${dbField} = ?`);
            params.push(data[key]);
        }
    }

    if (fields.length === 0) return getLeadById(id);

    // Auto-set plan_assigned_at when the plan assignment status is selected and a plan exists
    if ((data.status !== undefined && Number(data.status) === 4) && (data.planId !== undefined || data.status !== undefined)) {
        fields.push(`plan_assigned_at = COALESCE(plan_assigned_at, CURRENT_TIMESTAMP)`);
    }

    fields.push(`updated_by = ?`);
    params.push(updatedBy);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    await pool.query(`UPDATE saas_leads SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);

    return getLeadById(id);
};

const updateLeadStatus = async (id, status, updatedBy = null) => {
    const statusNum = Number(status);
    if (!Number.isInteger(statusNum)) {
        throw new Error('Invalid status code');
    }

    const fields = ['status = ?'];
    const params = [statusNum];

    if (statusNum === 4) {
        fields.push(`plan_assigned_at = COALESCE(plan_assigned_at, CURRENT_TIMESTAMP)`);
    }
    if (statusNum === 6) {
        fields.push(`converted_at = COALESCE(converted_at, CURRENT_TIMESTAMP)`);
    }

    fields.push(`updated_by = ?`, `updated_at = CURRENT_TIMESTAMP`);
    params.push(updatedBy, id);

    await pool.query(`UPDATE saas_leads SET ${fields.join(', ')} WHERE id = ?`, params);

    return getLeadById(id);
};

const softDeleteLead = async (id, updatedBy = null, lostReason = null) => {
    const [result] = await pool.query(
        `UPDATE saas_leads SET deleted_at = CURRENT_TIMESTAMP, status = 7, lost_reason = COALESCE(?, lost_reason), updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [lostReason || null, updatedBy, id]
    );
    return result.affectedRows > 0;
};

const markConverted = async (id, tenantId, connection, planId = null) => {
    const executor = connection || pool;
    await executor.query(
        `UPDATE saas_leads SET converted_tenant_id = ?, converted_at = CURRENT_TIMESTAMP, status = 6, deleted_at = NULL, plan_id = COALESCE(?, plan_id) WHERE id = ?`,
        [tenantId, planId, id]
    );
};

const addFollowup = async (leadId, data, createdBy = null) => {
    const { followupMode, outcome, notes = null, nextFollowupAt = null } = data;
    const [result] = await pool.query(
        `INSERT INTO saas_lead_followups (lead_id, followup_mode, outcome, notes, next_followup_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [leadId, followupMode, outcome, notes, nextFollowupAt, createdBy]
    );
    return result.insertId;
};

const lockLeadForConversion = async (id, connection) => {
    const [rows] = await connection.query(
        `SELECT id, converted_tenant_id, deleted_at FROM saas_leads WHERE id = ? FOR UPDATE`,
        [id]
    );
    if (rows.length === 0) return null;
    return rows[0];
};

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    updateLeadStatus,
    softDeleteLead,
    markConverted,
    addFollowup,
    lockLeadForConversion
};