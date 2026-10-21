const productAnalyticsService = require('../services/productAnalyticsService');

/**
 * Controller to handle product analytics overview (branches + users)
 */
const getOverviewAnalytics = async (req, res) => {
    try {
        const data = await productAnalyticsService.getOverviewAnalytics();
        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error fetching product analytics overview:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve product analytics overview'
        });
    }
};

/**
 * Controller to handle branch analytics
 */
const getBranchAnalytics = async (req, res) => {
    try {
        const data = await productAnalyticsService.getBranchesAnalytics();
        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error fetching branch analytics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve branch analytics'
        });
    }
};

/**
 * Controller to handle user analytics
 */
const getUserAnalytics = async (req, res) => {
    try {
        const data = await productAnalyticsService.getUsersAnalytics();
        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user analytics'
        });
    }
};

/**
 * Controller to handle module usage analytics directly from audit logs
 */
const getModuleUsage = async (req, res) => {
    try {
        const timeRange = req.query.timeRange || req.query.days || 'month';
        const tenantId = req.query.tenantId || null;
        const data = await productAnalyticsService.getModuleUsage(timeRange, tenantId);
        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error fetching module usage analytics:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to retrieve module usage analytics'
        });
    }
};

module.exports = {
    getOverviewAnalytics,
    getBranchAnalytics,
    getUserAnalytics,
    getModuleUsage
};
