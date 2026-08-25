const subscriptionModel = require('../models/subscriptionModel');

const getSubscriptions = async (limit, offset, search, status) => {
    return await subscriptionModel.getSubscriptions(limit, offset, search, status);
};

const getSubscriptionById = async (id) => {
    return await subscriptionModel.getSubscriptionById(id);
};

const changeSubscriptionPlan = async (id, planId) => {
    // Basic validation
    if (!planId) throw new Error('planId is required');
    return await subscriptionModel.updateSubscriptionPlan(id, planId);
};

const updateSubscriptionFull = async (id, data) => {
    if (!data.planId) throw new Error('planId is required');
    return await subscriptionModel.updateSubscriptionFull(id, data);
};

module.exports = {
    getSubscriptions,
    getSubscriptionById,
    changeSubscriptionPlan,
    updateSubscriptionFull
};
