const leadModel = require('../models/leadModel');

const getLeads = async (params) => {
    return await leadModel.getLeads(params);
};

const getLeadById = async (id) => {
    return await leadModel.getLeadById(id);
};

const createLead = async (data, createdBy) => {
    return await leadModel.createLead(data, createdBy);
};

const updateLead = async (id, data, updatedBy) => {
    return await leadModel.updateLead(id, data, updatedBy);
};

const updateLeadStatus = async (id, status, updatedBy) => {
    return await leadModel.updateLeadStatus(id, status, updatedBy);
};

const softDeleteLead = async (id, updatedBy, lostReason) => {
    return await leadModel.softDeleteLead(id, updatedBy, lostReason);
};

const addFollowup = async (leadId, data, createdBy) => {
    return await leadModel.addFollowup(leadId, data, createdBy);
};

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    updateLeadStatus,
    softDeleteLead,
    addFollowup
};