const billingModel = require('../models/billingModel');

const getInvoices = async (limit, offset, search, status, tenant, startDate, endDate) => {
    return await billingModel.getInvoices(limit, offset, search, status, tenant, startDate, endDate);
};

const getBillingSummary = async (year, month, startDate, endDate) => {
    return await billingModel.getBillingSummary(year, month, startDate, endDate);
};

const getRevenueTrend = async (year, startDate, endDate) => {
    return await billingModel.getRevenueTrend(year, startDate, endDate);
};

const getRevenueByMethod = async () => {
    return await billingModel.getRevenueByMethod();
};

const getRevenueByPlan = async (startDate, endDate) => {
    return await billingModel.getRevenueByPlan(startDate, endDate);
};

module.exports = {
    getInvoices,
    getBillingSummary,
    getRevenueTrend,
    getRevenueByMethod,
    getRevenueByPlan
};
