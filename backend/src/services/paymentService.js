const paymentModel = require('../models/paymentModel');

const getStudentLedger = async (tenantId, studentId) => {
    return await paymentModel.getStudentLedger(tenantId, studentId);
};

const recordPayment = async (payload) => {
    return await paymentModel.recordPayment(payload);
};

const createCollectionInvoice = async (payload) => {
    return await paymentModel.createCollectionInvoice(payload);
};

module.exports = {
    getStudentLedger,
    recordPayment,
    createCollectionInvoice
};