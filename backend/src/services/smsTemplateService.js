const smsTemplateModel = require('../models/smsTemplateModel');

const getSmsTemplates = async (params) => {
    return await smsTemplateModel.getSmsTemplates(params);
};

const getSmsTemplateById = async (id) => {
    return await smsTemplateModel.getSmsTemplateById(id);
};

const createSmsTemplate = async (data) => {
    if (!data.template_name) throw new Error('Template Name is required');
    if (!data.dlt_template_id) throw new Error('DLT Template ID is required');
    if (!data.message_body) throw new Error('Message body is required');

    return await smsTemplateModel.createSmsTemplate(data);
};

const updateSmsTemplate = async (id, data) => {
    const existing = await smsTemplateModel.getSmsTemplateById(id);
    if (!existing) throw new Error('SMS template not found');

    return await smsTemplateModel.updateSmsTemplate(id, data);
};

const deleteSmsTemplate = async (id) => {
    const existing = await smsTemplateModel.getSmsTemplateById(id);
    if (!existing) throw new Error('SMS template not found');

    return await smsTemplateModel.deleteSmsTemplate(id);
};

module.exports = {
    getSmsTemplates,
    getSmsTemplateById,
    createSmsTemplate,
    updateSmsTemplate,
    deleteSmsTemplate
};
