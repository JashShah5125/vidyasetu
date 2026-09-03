const billingService = require('../services/billingService');

const getInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', tenant = '', startDate = '', endDate = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await billingService.getInvoices(limit, offset, search, status, tenant, startDate, endDate);
        
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
        console.error('Error fetching invoices:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getBillingSummary = async (req, res) => {
    try {
        const { year, month, startDate, endDate } = req.query;
        const summary = await billingService.getBillingSummary(year, month, startDate, endDate);
        res.status(200).json({ status: 'success', data: summary });
    } catch (error) {
        console.error('Error fetching billing summary:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getRevenueTrend = async (req, res) => {
    try {
        const { year, startDate, endDate } = req.query;
        const trend = await billingService.getRevenueTrend(year, startDate, endDate);
        res.status(200).json({ status: 'success', data: trend });
    } catch (error) {
        console.error('Error fetching revenue trend:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getRevenueByMethod = async (req, res) => {
    try {
        const data = await billingService.getRevenueByMethod();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching revenue by method:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getRevenueByPlan = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await billingService.getRevenueByPlan(startDate, endDate);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching revenue by plan:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getInvoices,
    getBillingSummary,
    getRevenueTrend,
    getRevenueByMethod,
    getRevenueByPlan
};
