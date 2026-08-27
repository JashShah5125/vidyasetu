const planService = require('../services/planService');

const getPlans = async (req, res) => {
    try {
        const { status } = req.query;
        let statuses;
        if (status) {
            statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        }
        const plans = await planService.getPlans(statuses);
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
        if (error.code === 'EXACT_DUPLICATE') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create plan' });
    }
};

const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        await planService.updatePlan(id, req.body);
        res.status(200).json({ status: 'success', message: 'Plan updated successfully' });
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update plan' });
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

const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await planService.deletePlan(id);
        if (!success) return res.status(404).json({ status: 'error', message: 'Plan not found' });
        res.status(200).json({ status: 'success', message: 'Plan soft deleted successfully' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updatePlanVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibleTo } = req.body;
        
        if (!Array.isArray(visibleTo)) {
            return res.status(400).json({ status: 'error', message: 'visibleTo must be an array' });
        }

        await planService.updatePlanVisibility(id, visibleTo);
        res.status(200).json({ status: 'success', message: 'Visibility updated successfully' });
    } catch (error) {
        console.error('Error updating plan visibility:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
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
