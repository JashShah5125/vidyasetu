const supportModel = require('../models/supportModel');

const getTickets = async (filters) => {
    return await supportModel.getTickets(filters);
};

const getTicketByNumber = async (ticketNumber) => {
    return await supportModel.getTicketByNumber(ticketNumber);
};

const createTicket = async (payload) => {
    return await supportModel.createTicket(payload);
};

const addReply = async (payload) => {
    return await supportModel.addReply(payload);
};

const updateTicket = async (ticketNumber, payload) => {
    return await supportModel.updateTicket(ticketNumber, payload);
};

const deleteTicket = async (ticketNumber) => {
    return await supportModel.deleteTicket(ticketNumber);
};

const resolveTicket = async (ticketNumber) => {
    return await supportModel.resolveTicket(ticketNumber);
};

const updateTicketStatus = async (ticketNumber, status) => {
    return await supportModel.updateTicketStatus(ticketNumber, status);
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