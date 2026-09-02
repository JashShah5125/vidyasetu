const supportService = require('../services/supportService');

const getTicketAccess = (req, ticket) => {
    if (req.user.isSaasAdmin) return true;
    return String(ticket.tenantId) === String(req.user.tenantId);
};

const listTickets = async (req, res) => {
    try {
        const { status = 'All', search = '' } = req.query;
        const tenantId = req.user.isSaasAdmin ? null : req.user.tenantId;

        const data = await supportService.getTickets({ tenantId, status, search });

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getTicket = async (req, res) => {
    try {
        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        if (!getTicketAccess(req, ticket)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        res.status(200).json({ status: 'success', data: ticket });
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createTicket = async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (!subject || !description) {
            return res.status(400).json({ status: 'error', message: 'Subject and description are required' });
        }

        const tenantId = req.user.isSaasAdmin ? (req.body.tenantId || null) : req.user.tenantId;
        let attachmentUrl = null;
        let attachmentName = null;
        if (req.file) {
            attachmentUrl = `/uploads/support/${req.file.filename}`;
            attachmentName = req.file.originalname;
        }
        const ticket = await supportService.createTicket({
            tenantId,
            subject,
            description,
            createdBy: req.user.userId,
            attachmentUrl,
            attachmentName
        });

        res.status(201).json({ status: 'success', data: ticket });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const addReply = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ status: 'error', message: 'Reply message is required' });
        }

        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        if (!getTicketAccess(req, ticket)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        let attachmentUrl = null;
        let attachmentName = null;
        if (req.file) {
            attachmentUrl = `/uploads/support/${req.file.filename}`;
            attachmentName = req.file.originalname;
        }

        const updated = await supportService.addReply({
            ticketIdentifier: req.params.ticketNumber,
            senderId: req.user.userId,
            senderRole: req.user.isSaasAdmin ? 'staff' : 'tenant',
            isFromStaff: !!req.user.isSaasAdmin,
            message,
            attachmentUrl,
            attachmentName
        });

        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error replying to support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateTicket = async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (subject === undefined && description === undefined) {
            return res.status(400).json({ status: 'error', message: 'At least one of subject or description is required' });
        }

        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        if (!getTicketAccess(req, ticket)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const updated = await supportService.updateTicket(req.params.ticketNumber, { subject, description });

        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const deleteTicket = async (req, res) => {
    try {
        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        if (!getTicketAccess(req, ticket)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const deleted = await supportService.deleteTicket(req.params.ticketNumber);

        res.status(200).json({ status: 'success', message: deleted ? 'Ticket deleted' : 'Failed to delete ticket' });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const resolveTicket = async (req, res) => {
    try {
        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        if (!getTicketAccess(req, ticket)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const updated = await supportService.resolveTicket(req.params.ticketNumber);
        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error resolving support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    listTickets,
    getTicket,
    createTicket,
    addReply,
    updateTicket,
    deleteTicket,
    resolveTicket
};