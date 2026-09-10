const supportService = require('../services/supportService');
const branchModel = require('../models/branchModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const isBranchAdmin = (role) => role === 'branch-admin' || role === 'branch_admin';
const isInstAdmin = (role) => role === 'inst_admin' || role === 'inst-admin';
const isSaasAdmin = (req) => Boolean(req.user?.isSaasAdmin);

// Central security boundary for support tickets
const getSupportTicketAccess = async (req, ticket) => {
    if (!ticket) return false;
    const user = req.user;
    const userRole = user?.role;
    const tenantId = resolveTenantId(req);

    // SaaS Admin has global access to SAAS_SUPPORT channel tickets
    if (isSaasAdmin(req)) {
        return ticket.channel === 'SAAS_SUPPORT';
    }

    // Institute Admin has access to all SAAS_SUPPORT and INSTITUTE_SUPPORT tickets for their tenant
    if (isInstAdmin(userRole)) {
        return String(ticket.tenantId) === String(tenantId);
    }

    // Branch Admin has access strictly to INSTITUTE_SUPPORT tickets in their assigned branch
    if (isBranchAdmin(userRole)) {
        if (ticket.channel !== 'INSTITUTE_SUPPORT' || String(ticket.tenantId) !== String(tenantId)) {
            return false;
        }
        if (!ticket.branchId) return false;
        const hasAccess = await branchModel.verifyUserBranchAccess(tenantId, user.userId, ticket.branchId);
        return hasAccess;
    }

    // Fallback for other roles within tenant
    return String(ticket.tenantId) === String(tenantId);
};

const listTickets = async (req, res) => {
    try {
        const { status = 'All', search = '', channel: queryChannel, branch_id, branchId } = req.query;
        const tenantId = isSaasAdmin(req) ? null : resolveTenantId(req);
        const userRole = req.user?.role;
        const isBranch = isBranchAdmin(userRole);

        let channel = queryChannel;
        let targetBranchId = branchId || branch_id || null;

        // Channel and Branch Scoping Rules
        if (isSaasAdmin(req)) {
            channel = 'SAAS_SUPPORT';
        } else if (isBranch) {
            // Branch Admins are locked strictly to INSTITUTE_SUPPORT and their own branch
            channel = 'INSTITUTE_SUPPORT';
            const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
            if (!userBranchIds.length) {
                return res.status(200).json({ status: 'success', data: [] });
            }
            targetBranchId = String(userBranchIds[0]);
        } else if (isInstAdmin(userRole)) {
            // Institute Admin can view either channel (defaults to INSTITUTE_SUPPORT if on /api/branch or /api/institute, else queryChannel or All)
            if (req.baseUrl.includes('/branch') || req.baseUrl.includes('/institute')) {
                channel = 'INSTITUTE_SUPPORT';
            } else if (!channel) {
                channel = 'SAAS_SUPPORT';
            }
        }

        const data = await supportService.getTickets({
            tenantId,
            branchId: targetBranchId,
            channel,
            status,
            search
        });

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

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
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

        const userRole = req.user?.role;
        const tenantId = isSaasAdmin(req) ? (req.body.tenantId || null) : resolveTenantId(req);

        let channel = 'SAAS_SUPPORT';
        let branchId = null;
        let senderType = 'INSTITUTE_ADMIN';

        if (isBranchAdmin(userRole)) {
            channel = 'INSTITUTE_SUPPORT';
            senderType = 'BRANCH_ADMIN';
            const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user.userId);
            if (!userBranchIds.length) {
                return res.status(400).json({ status: 'error', message: 'User is not assigned to an active branch' });
            }
            branchId = userBranchIds[0];
        } else if (isInstAdmin(userRole)) {
            if (req.baseUrl.includes('/institute') || req.body.channel === 'INSTITUTE_SUPPORT') {
                channel = 'INSTITUTE_SUPPORT';
                senderType = 'INSTITUTE_ADMIN';
                branchId = req.body.branchId || req.body.branch_id || null;
            } else {
                channel = 'SAAS_SUPPORT';
                senderType = 'INSTITUTE_ADMIN';
            }
        } else if (isSaasAdmin(req)) {
            channel = 'SAAS_SUPPORT';
            senderType = 'SAAS_ADMIN';
        }

        let attachmentUrl = null;
        let attachmentName = null;
        if (req.file) {
            attachmentUrl = `/uploads/support/${req.file.filename}`;
            attachmentName = req.file.originalname;
        }

        const ticket = await supportService.createTicket({
            tenantId,
            branchId,
            channel,
            subject,
            description,
            createdBy: req.user.userId,
            senderType,
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

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const userRole = req.user?.role;
        let senderRole = 'tenant';
        let senderType = 'INSTITUTE_ADMIN';
        let isFromStaff = false;

        // Role & Staff status resolution per channel
        if (ticket.channel === 'INSTITUTE_SUPPORT') {
            if (isInstAdmin(userRole) || isSaasAdmin(req)) {
                senderRole = 'staff';
                senderType = 'INSTITUTE_ADMIN';
                isFromStaff = true;
            } else {
                senderRole = 'tenant';
                senderType = 'BRANCH_ADMIN';
                isFromStaff = false;
            }
        } else {
            // SAAS_SUPPORT channel
            if (isSaasAdmin(req)) {
                senderRole = 'staff';
                senderType = 'SAAS_ADMIN';
                isFromStaff = true;
            } else {
                senderRole = 'tenant';
                senderType = 'INSTITUTE_ADMIN';
                isFromStaff = false;
            }
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
            senderRole,
            senderType,
            isFromStaff,
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

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
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

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
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

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const updated = await supportService.resolveTicket(req.params.ticketNumber);
        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error resolving support ticket:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
            });
        }

        const ticket = await supportService.getTicketByNumber(req.params.ticketNumber);
        if (!ticket) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        const hasAccess = await getSupportTicketAccess(req, ticket);
        if (!hasAccess) {
            return res.status(403).json({ status: 'error', message: 'Forbidden. You do not have access to this ticket.' });
        }

        const updated = await supportService.updateTicketStatus(req.params.ticketNumber, status);
        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error updating ticket status:', error);
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
    resolveTicket,
    updateTicketStatus
};