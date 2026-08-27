const billingModel = require('../models/billingModel');

const getInvoices = async (limit, offset, search, status) => {
    return await billingModel.getInvoices(limit, offset, search, status);
};

const getBillingSummary = async () => {
    return await billingModel.getBillingSummary();
};

module.exports = {
    getInvoices,
    getBillingSummary
};
