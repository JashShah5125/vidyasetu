const subscriptionService = require('../services/subscriptionService');

const getSubscriptions = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await subscriptionService.getSubscriptions(limit, offset, search, status);
        
        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getSubscriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await subscriptionService.getSubscriptionById(id);
        if (!subscription) return res.status(404).json({ status: 'error', message: 'Subscription not found' });
        res.status(200).json({ status: 'success', data: subscription });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const changeSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { planId } = req.body;
        const success = await subscriptionService.changeSubscriptionPlan(id, planId);
        if (!success) return res.status(404).json({ status: 'error', message: 'Subscription not found' });
        res.status(200).json({ status: 'success', message: 'Subscription plan updated successfully' });
    } catch (error) {
        console.error('Error changing subscription plan:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to change subscription plan' });
    }
};

const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const success = await subscriptionService.updateSubscriptionFull(id, data);
        if (!success) return res.status(404).json({ status: 'error', message: 'Subscription not found' });
        res.status(200).json({ status: 'success', message: 'Subscription updated successfully' });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update subscription' });
    }
};

module.exports = {
    getSubscriptions,
    getSubscriptionById,
    changeSubscriptionPlan,
    updateSubscription
};
