const pool = require('../config/db');

const pad = (n) => String(n).padStart(2, '0');

const formatDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    }
    const s = String(value);
    return s.includes('T') ? s.replace('T', ' ').split('.')[0] : s;
};

const REPLY_SELECT = `
    SELECT r.*, u.name AS sender_name
    FROM support_replies r
    LEFT JOIN users u ON r.sender_id = u.id
`;

const mapReply = (reply, defaultSenderName) => ({
    sender_id: reply.sender_id,
    sender: reply.sender_name || defaultSenderName || (reply.sender_id ? null : 'Support Team'),
    role: reply.sender_role,
    sender_type: reply.sender_type || (reply.is_from_staff ? 'STAFF' : 'TENANT'),
    is_from_staff: Boolean(reply.is_from_staff),
    time: formatDateTime(reply.created_at),
    text: reply.message,
    attachment_url: reply.attachment_url || null,
    attachment_name: reply.attachment_name || null
});

const fetchReplies = async (ticketIds, ticketMetadataMap = {}) => {
    if (!ticketIds || ticketIds.length === 0) return {};
    const [replies] = await pool.query(
        `${REPLY_SELECT} WHERE r.ticket_id IN (?) ORDER BY r.created_at ASC, r.id ASC`,
        [ticketIds]
    );
    const byTicket = {};
    for (const reply of replies) {
        if (!byTicket[reply.ticket_id]) byTicket[reply.ticket_id] = [];
        const meta = ticketMetadataMap[reply.ticket_id] || {};
        const fallbackName = reply.is_from_staff ? 'Support Desk' : (meta.branchName || meta.tenantName || 'Requester');
        byTicket[reply.ticket_id].push(mapReply(reply, fallbackName));
    }
    return byTicket;
};

const mapTicket = (ticket, replies) => ({
    id: ticket.ticket_number,
    tenantId: ticket.tenant_id,
    tenantName: ticket.tenant_name || (ticket.tenant_id ? null : 'Platform Request'),
    branchId: ticket.branch_id ? String(ticket.branch_id) : null,
    branchName: ticket.branch_name || null,
    channel: ticket.channel || 'SAAS_SUPPORT',
    subject: ticket.subject,
    status: ticket.status,
    created: formatDateTime(ticket.created_at),
    description: ticket.description,
    replies
});

const getTickets = async ({ tenantId = null, branchId = null, channel = null, status = 'All', search = '' } = {}) => {
    let query = `
        SELECT st.*, t.name AS tenant_name, b.name AS branch_name
        FROM support_tickets st
        LEFT JOIN tenants t ON st.tenant_id = t.id
        LEFT JOIN branches b ON st.branch_id = b.id
        WHERE 1=1
    `;
    const params = [];

    if (tenantId) {
        query += ` AND st.tenant_id = ?`;
        params.push(tenantId);
    }

    if (branchId && String(branchId).toLowerCase() !== 'all') {
        query += ` AND (st.branch_id = ? OR b.code = ?)`;
        params.push(branchId, branchId);
    }

    if (channel && String(channel).toLowerCase() !== 'all') {
        query += ` AND st.channel = ?`;
        params.push(channel);
    }

    if (status && status !== 'All') {
        query += ` AND st.status = ?`;
        params.push(status);
    }

    if (search && String(search).trim()) {
        query += ` AND (st.subject LIKE ? OR st.ticket_number LIKE ? OR COALESCE(t.name, '') LIKE ? OR COALESCE(b.name, '') LIKE ?)`;
        const pattern = `%${String(search).trim()}%`;
        params.push(pattern, pattern, pattern, pattern);
    }

    query += ` ORDER BY st.created_at DESC`;

    const [tickets] = await pool.query(query, params);
    if (tickets.length === 0) return [];

    const ticketMetadataMap = tickets.reduce((acc, t) => {
        acc[t.id] = { tenantName: t.tenant_name, branchName: t.branch_name };
        return acc;
    }, {});

    const repliesByTicket = await fetchReplies(tickets.map(t => t.id), ticketMetadataMap);

    return tickets.map(t => mapTicket(t, repliesByTicket[t.id] || []));
};

const getTicketByNumber = async (ticketNumber) => {
    const [[ticket]] = await pool.query(
        `SELECT st.*, t.name AS tenant_name, b.name AS branch_name
         FROM support_tickets st
         LEFT JOIN tenants t ON st.tenant_id = t.id
         LEFT JOIN branches b ON st.branch_id = b.id
         WHERE st.ticket_number = ?`,
        [ticketNumber]
    );
    if (!ticket) return null;

    const repliesByTicket = await fetchReplies([ticket.id], {
        [ticket.id]: { tenantName: ticket.tenant_name, branchName: ticket.branch_name }
    });

    return mapTicket(ticket, repliesByTicket[ticket.id] || []);
};

const createTicket = async ({
    tenantId,
    branchId = null,
    channel = 'SAAS_SUPPORT',
    subject,
    description,
    createdBy,
    senderType = null,
    attachmentUrl = null,
    attachmentName = null
}) => {
    const [[{ nextId }]] = await pool.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM support_tickets`
    );
    const ticketNumber = `TKT-${1000 + Number(nextId)}`;

    const effectiveChannel = channel === 'INSTITUTE_SUPPORT' ? 'INSTITUTE_SUPPORT' : 'SAAS_SUPPORT';
    const effectiveSenderType = senderType || (effectiveChannel === 'INSTITUTE_SUPPORT' ? 'BRANCH_ADMIN' : 'INSTITUTE_ADMIN');

    const [result] = await pool.query(
        `INSERT INTO support_tickets (ticket_number, tenant_id, branch_id, channel, subject, description, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'Open', ?)`,
        [ticketNumber, tenantId || null, branchId || null, effectiveChannel, subject, description, createdBy || null]
    );
    const ticketId = result.insertId;

    await pool.query(
        `INSERT INTO support_replies (ticket_id, sender_id, sender_role, sender_type, is_from_staff, message, attachment_url, attachment_name)
         VALUES (?, ?, 'tenant', ?, 0, ?, ?, ?)`,
        [ticketId, createdBy || null, effectiveSenderType, description, attachmentUrl, attachmentName]
    );

    return getTicketByNumber(ticketNumber);
};

const addReply = async ({
    ticketIdentifier,
    senderId,
    senderRole = 'tenant',
    senderType = null,
    isFromStaff = false,
    message,
    attachmentUrl = null,
    attachmentName = null
}) => {
    const [[ticket]] = await pool.query(
        `SELECT * FROM support_tickets WHERE ticket_number = ?`,
        [ticketIdentifier]
    );
    if (!ticket) return null;

    const effectiveSenderType = senderType || (isFromStaff ? 'STAFF' : 'TENANT');

    await pool.query(
        `INSERT INTO support_replies (ticket_id, sender_id, sender_role, sender_type, is_from_staff, message, attachment_url, attachment_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            ticket.id,
            senderId || null,
            senderRole === 'staff' ? 'staff' : 'tenant',
            effectiveSenderType,
            isFromStaff ? 1 : 0,
            message,
            attachmentUrl,
            attachmentName
        ]
    );

    // If response is from staff/handling admin, transition Open -> In Progress
    if (isFromStaff && ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
        await pool.query(
            `UPDATE support_tickets SET status = 'In Progress' WHERE id = ?`,
            [ticket.id]
        );
    }

    return getTicketByNumber(ticketIdentifier);
};

const updateTicket = async (ticketNumber, { subject, description }) => {
    const fields = [];
    const params = [];

    if (subject !== undefined && subject !== null) {
        fields.push('subject = ?');
        params.push(String(subject));
    }
    if (description !== undefined && description !== null) {
        fields.push('description = ?');
        params.push(String(description));
    }
    if (fields.length === 0) return null;

    const [result] = await pool.query(
        `UPDATE support_tickets SET ${fields.join(', ')} WHERE ticket_number = ?`,
        [...params, ticketNumber]
    );
    if (result.affectedRows === 0) {
        return getTicketByNumber(ticketNumber);
    }

    // Keep the first reply (requester message) in sync with the ticket description.
    if (description !== undefined) {
        const [[firstReply]] = await pool.query(
            `SELECT r.id FROM support_replies r
             JOIN support_tickets st ON r.ticket_id = st.id
             WHERE st.ticket_number = ?
             ORDER BY r.created_at ASC, r.id ASC LIMIT 1`,
            [ticketNumber]
        );
        if (firstReply) {
            await pool.query(
                `UPDATE support_replies SET message = ? WHERE id = ?`,
                [String(description), firstReply.id]
            );
        }
    }

    return getTicketByNumber(ticketNumber);
};

const deleteTicket = async (ticketNumber) => {
    const [result] = await pool.query(
        `DELETE FROM support_tickets WHERE ticket_number = ?`,
        [ticketNumber]
    );
    return result.affectedRows > 0;
};

const resolveTicket = async (ticketNumber) => {
    const [result] = await pool.query(
        `UPDATE support_tickets SET status = 'Resolved' WHERE ticket_number = ? AND status NOT IN ('Resolved', 'Closed')`,
        [ticketNumber]
    );
    return getTicketByNumber(ticketNumber);
};

const updateTicketStatus = async (ticketNumber, status) => {
    await pool.query(
        `UPDATE support_tickets SET status = ? WHERE ticket_number = ?`,
        [status, ticketNumber]
    );
    return getTicketByNumber(ticketNumber);
};

module.exports = {
    getTickets,
    getTicketByNumber,
    createTicket,
    addReply,
    updateTicket,
    deleteTicket,
    resolveTicket,
    updateTicketStatus
};