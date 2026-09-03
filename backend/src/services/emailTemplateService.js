const emailTemplateModel = require('../models/emailTemplateModel');

const getTemplates = async (limit, offset, search, category, status) => {
    const data = await emailTemplateModel.getAll(limit, offset, search, category, status);
    const total = await emailTemplateModel.getTotalCount(search, category, status);
    const categories = await emailTemplateModel.getCategories();
    return { data, total, categories };
};

const getTemplateById = async (id) => {
    return await emailTemplateModel.getById(id);
};

const createTemplate = async (templateData) => {
    const existing = await emailTemplateModel.getByTemplateKey(templateData.template_key, templateData.tenant_id || 1);
    if (existing) {
        const err = new Error('A template with this key already exists');
        err.code = 'DUPLICATE_KEY';
        throw err;
    }

    const id = await emailTemplateModel.create(templateData);
    return await emailTemplateModel.getById(id);
};

const updateTemplate = async (id, templateData) => {
    const existing = await emailTemplateModel.getById(id);
    if (!existing) {
        return null;
    }

    const success = await emailTemplateModel.update(id, templateData);
    if (!success) return null;

    return await emailTemplateModel.getById(id);
};

const updateTemplateStatus = async (id, status) => {
    const existing = await emailTemplateModel.getById(id);
    if (!existing) return null;

    const success = await emailTemplateModel.updateStatus(id, status);
    if (!success) return null;

    return await emailTemplateModel.getById(id);
};

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    updateTemplateStatus
};
