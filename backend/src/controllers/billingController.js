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
        const { year, month, startDate, endDate, preset, time_range } = req.query;
        let sDate = startDate;
        let eDate = endDate;

        const hasCustomFilter = (year && year !== 'all') || (month && month !== 'all');
        const effectivePreset = preset || time_range;

        if (effectivePreset && (!sDate && !eDate) && !hasCustomFilter) {
            const today = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            if (effectivePreset === 'daily' || effectivePreset === 'day') {
                sDate = fmt(today);
                eDate = fmt(today);
            } else if (effectivePreset === 'weekly' || effectivePreset === 'week') {
                const past7 = new Date(today);
                past7.setDate(today.getDate() - 6);
                sDate = fmt(past7);
                eDate = fmt(today);
            } else if (effectivePreset === 'monthly' || effectivePreset === 'month') {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                sDate = fmt(startOfMonth);
                eDate = fmt(today);
            }
        }

        const summary = await billingService.getBillingSummary(year, month, sDate, eDate);
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

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await billingService.getInvoiceById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ status: 'error', message: 'Invoice not found' });
        }
        res.status(200).json({ status: 'success', data: invoice });
    } catch (error) {
        handleError(res, error, 'Error fetching invoice:');
    }
};

const createInvoice = async (req, res) => {
    try {
        const userId = (req.user && (req.user.userId || req.user.id)) || 1;
        const invoice = await billingService.createInvoice(req.body, userId);
        res.status(201).json({ status: 'success', message: 'Invoice created successfully', data: invoice });
    } catch (error) {
        handleError(res, error, 'Error creating invoice:');
    }
};

const updateInvoice = async (req, res) => {
    try {
        const invoice = await billingService.updateInvoice(req.params.id, req.body);
        res.status(200).json({ status: 'success', message: 'Invoice updated successfully', data: invoice });
    } catch (error) {
        handleError(res, error, 'Error updating invoice:');
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const result = await billingService.deleteInvoice(req.params.id);
        res.status(200).json({ status: 'success', message: 'Invoice deleted successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error deleting invoice:');
    }
};

module.exports = {
    getInvoices,
    getBillingSummary,
    getRevenueTrend,
    getRevenueByMethod,
    getRevenueByPlan,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice
};
