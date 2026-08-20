const planService = require('../services/planService');

const getPlans = async (req, res) => {
    try {
        const plans = await planService.getPlans();
        res.status(200).json({ status: 'success', data: plans });
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getPlanById = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await planService.getPlanById(id);
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found' });
        res.status(200).json({ status: 'success', data: plan });
    } catch (error) {
        console.error('Error fetching plan:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createPlan = async (req, res) => {
    try {
        const planId = await planService.createPlan(req.body);
        res.status(201).json({ status: 'success', message: 'Plan created successfully', data: { id: planId } });
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create plan' });
    }
};

const updatePlanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const success = await planService.updatePlanStatus(id, is_active);
        if (!success) return res.status(404).json({ status: 'error', message: 'Plan not found' });
        res.status(200).json({ status: 'success', message: 'Plan status updated' });
    } catch (error) {
        console.error('Error updating plan status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlanStatus
};
