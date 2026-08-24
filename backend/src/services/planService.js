const planModel = require('../models/planModel');

const getPlans = async (statuses) => {
    return await planModel.getPlans(statuses);
};

const getPlanById = async (id) => {
    return await planModel.getPlanById(id);
};

const createPlan = async (planData) => {
    // Basic business validation
    if (!planData.name || !planData.code) {
        throw new Error('Name and Code are required');
    }
    return await planModel.createPlan(planData);
};

const updatePlan = async (id, planData) => {
    return await planModel.updatePlan(id, planData);
};

const updatePlanStatus = async (id, status) => {
    return await planModel.updatePlanStatus(id, status);
};

const deletePlan = async (id) => {
    return await planModel.deletePlan(id);
};

const updatePlanVisibility = async (id, visibleTo) => {
    if (!Array.isArray(visibleTo)) {
        throw new Error("visibleTo must be an array of tenant IDs");
    }
    return await planModel.updatePlanVisibility(id, visibleTo);
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlan,
    updatePlanStatus,
    updatePlanVisibility,
    deletePlan
};
