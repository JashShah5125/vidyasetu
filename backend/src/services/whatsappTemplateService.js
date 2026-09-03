const whatsappTemplateModel = require('../models/whatsappTemplateModel');

const getWhatsAppTemplates = async (params) => {
    return await whatsappTemplateModel.getWhatsAppTemplates(params);
};

const getWhatsAppTemplateById = async (id) => {
    return await whatsappTemplateModel.getWhatsAppTemplateById(id);
};

const createWhatsAppTemplate = async (data) => {
    if (!data.template_name) throw new Error('Template Name is required');
    if (!data.dlt_template_id) throw new Error('DLT Template ID is required');
    if (!data.message_body) throw new Error('Message body is required');

    return await whatsappTemplateModel.createWhatsAppTemplate(data);
};

const updateWhatsAppTemplate = async (id, data) => {
    const existing = await whatsappTemplateModel.getWhatsAppTemplateById(id);
    if (!existing) throw new Error('WhatsApp template not found');

    return await whatsappTemplateModel.updateWhatsAppTemplate(id, data);
};

const deleteWhatsAppTemplate = async (id) => {
    const existing = await whatsappTemplateModel.getWhatsAppTemplateById(id);
    if (!existing) throw new Error('WhatsApp template not found');

    return await whatsappTemplateModel.deleteWhatsAppTemplate(id);
};

module.exports = {
    getWhatsAppTemplates,
    getWhatsAppTemplateById,
    createWhatsAppTemplate,
    updateWhatsAppTemplate,
    deleteWhatsAppTemplate
};
