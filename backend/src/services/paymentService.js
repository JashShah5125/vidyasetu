const paymentModel = require('../models/paymentModel');

const getStudentLedger = async (tenantId, studentId, accessContext = null) => {
    return await paymentModel.getStudentLedger(tenantId, studentId, accessContext);
};

const getStudentFeeAssignment = async (tenantId, studentId, accessContext = null) => {
    return await paymentModel.getStudentFeeAssignment(tenantId, studentId, accessContext);
};

const updateStudentFeeAssignment = async (tenantId, studentId, payload, accessContext = null, userId = 1) => {
    return await paymentModel.updateStudentFeeAssignment(tenantId, studentId, payload, accessContext, userId);
};

const recordPayment = async (payload) => {
    return await paymentModel.recordPayment(payload);
};

const createCollectionInvoice = async (payload) => {
    return await paymentModel.createCollectionInvoice(payload);
};

const getInvoiceById = async (tenantId, invoiceId, accessContext = null) => {
    return await paymentModel.getInvoiceById(tenantId, invoiceId, accessContext);
};

module.exports = {
    getStudentLedger,
    getStudentFeeAssignment,
    updateStudentFeeAssignment,
    recordPayment,
    createCollectionInvoice,
    getInvoiceById
};