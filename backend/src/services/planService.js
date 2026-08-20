const planModel = require('../models/planModel');

const getPlans = async () => {
    return await planModel.getPlans();
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

const updatePlanStatus = async (id, status) => {
    return await planModel.updatePlanStatus(id, status);
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlanStatus
};
