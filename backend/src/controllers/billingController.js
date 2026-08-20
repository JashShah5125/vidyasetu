const billingService = require('../services/billingService');

const getInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await billingService.getInvoices(limit, offset, search, status);
        
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
        const summary = await billingService.getBillingSummary();
        res.status(200).json({ status: 'success', data: summary });
    } catch (error) {
        console.error('Error fetching billing summary:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getInvoices,
    getBillingSummary
};
