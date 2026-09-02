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

const mapReply = (reply, tenantName) => ({
    sender_id: reply.sender_id,
    sender: reply.sender_name || tenantName || (reply.sender_id ? null : 'System / Platform'),
    role: reply.sender_role,
    is_from_staff: Boolean(reply.is_from_staff),
    time: formatDateTime(reply.created_at),
    text: reply.message,
    attachment_url: reply.attachment_url || null,
    attachment_name: reply.attachment_name || null
});

const fetchReplies = async (ticketIds, tenantNameMap = {}) => {
    if (!ticketIds || ticketIds.length === 0) return {};
    const [replies] = await pool.query(
        `${REPLY_SELECT} WHERE r.ticket_id IN (?) ORDER BY r.created_at ASC, r.id ASC`,
        [ticketIds]
    );
    const byTicket = {};
    for (const reply of replies) {
        if (!byTicket[reply.ticket_id]) byTicket[reply.ticket_id] = [];
        byTicket[reply.ticket_id].push(mapReply(reply, tenantNameMap[reply.ticket_id]));
    }
    return byTicket;
};

const mapTicket = (ticket, replies) => ({
    id: ticket.ticket_number,
    tenantId: ticket.tenant_id,
    tenantName: ticket.tenant_name || (ticket.tenant_id ? null : 'Platform Request'),
    subject: ticket.subject,
    status: ticket.status,
    created: formatDateTime(ticket.created_at),
    description: ticket.description,
    replies
});

const getTickets = async ({ tenantId = null, status = 'All', search = '' } = {}) => {
    let query = `
        SELECT st.*, t.name AS tenant_name
        FROM support_tickets st
        LEFT JOIN tenants t ON st.tenant_id = t.id
        WHERE 1=1
    `;
    const params = [];

    if (tenantId) {
        query += ` AND st.tenant_id = ?`;
        params.push(tenantId);
    }

    if (status && status !== 'All') {
        query += ` AND st.status = ?`;
        params.push(status);
    }

    if (search) {
        query += ` AND (st.subject LIKE ? OR st.ticket_number LIKE ? OR COALESCE(t.name, '') LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
    }

    query += ` ORDER BY st.created_at DESC`;

    const [tickets] = await pool.query(query, params);
    if (tickets.length === 0) return [];

    const tenantNameMap = tickets.reduce((acc, t) => {
        acc[t.id] = t.tenant_name;
        return acc;
    }, {});
    const repliesByTicket = await fetchReplies(tickets.map(t => t.id), tenantNameMap);

    return tickets.map(t => mapTicket(t, repliesByTicket[t.id] || []));
};

const getTicketByNumber = async (ticketNumber) => {
    const [[ticket]] = await pool.query(
        `SELECT st.*, t.name AS tenant_name
         FROM support_tickets st
         LEFT JOIN tenants t ON st.tenant_id = t.id
         WHERE st.ticket_number = ?`,
        [ticketNumber]
    );
    if (!ticket) return null;

    const repliesByTicket = await fetchReplies([ticket.id], { [ticket.id]: ticket.tenant_name });

    return mapTicket(ticket, repliesByTicket[ticket.id] || []);
};

const createTicket = async ({ tenantId, subject, description, createdBy, attachmentUrl = null, attachmentName = null }) => {
    const [[{ nextId }]] = await pool.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM support_tickets`
    );
    const ticketNumber = `TKT-${1000 + Number(nextId)}`;

    const [result] = await pool.query(
        `INSERT INTO support_tickets (ticket_number, tenant_id, subject, description, status, created_by)
         VALUES (?, ?, ?, ?, 'Open', ?)`,
        [ticketNumber, tenantId || null, subject, description, createdBy || null]
    );
    const ticketId = result.insertId;

    await pool.query(
        `INSERT INTO support_replies (ticket_id, sender_id, sender_role, is_from_staff, message, attachment_url, attachment_name)
         VALUES (?, ?, 'tenant', 0, ?, ?, ?)`,
        [ticketId, createdBy || null, description, attachmentUrl, attachmentName]
    );

    return getTicketByNumber(ticketNumber);
};

const addReply = async ({ ticketIdentifier, senderId, senderRole = 'tenant', isFromStaff = false, message, attachmentUrl = null, attachmentName = null }) => {
    const [[ticket]] = await pool.query(
        `SELECT * FROM support_tickets WHERE ticket_number = ?`,
        [ticketIdentifier]
    );
    if (!ticket) return null;

    await pool.query(
        `INSERT INTO support_replies (ticket_id, sender_id, sender_role, is_from_staff, message, attachment_url, attachment_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ticket.id, senderId || null, senderRole === 'staff' ? 'staff' : 'tenant', isFromStaff ? 1 : 0, message, attachmentUrl, attachmentName]
    );

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

module.exports = {
    getTickets,
    getTicketByNumber,
    createTicket,
    addReply,
    updateTicket,
    deleteTicket,
    resolveTicket
};