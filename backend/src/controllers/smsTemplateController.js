const smsTemplateService = require('../services/smsTemplateService');

const getSmsTemplates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await smsTemplateService.getSmsTemplates({
            limit: Number(limit),
            offset: Number(offset),
            search,
            category,
            status
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            categories: result.categories,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching SMS templates:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const getSmsTemplateById = async (req, res) => {
    try {
        const template = await smsTemplateService.getSmsTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'SMS template not found' });
        }
        res.status(200).json({ status: 'success', data: template });
    } catch (error) {
        console.error('Error fetching SMS template:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const createSmsTemplate = async (req, res) => {
    try {
        const template = await smsTemplateService.createSmsTemplate(req.body);
        res.status(201).json({ status: 'success', data: template, message: 'SMS template created successfully' });
    } catch (error) {
        console.error('Error creating SMS template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create SMS template' });
    }
};

const updateSmsTemplate = async (req, res) => {
    try {
        const template = await smsTemplateService.updateSmsTemplate(req.params.id, req.body);
        res.status(200).json({ status: 'success', data: template, message: 'SMS template updated successfully' });
    } catch (error) {
        console.error('Error updating SMS template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update SMS template' });
    }
};

const deleteSmsTemplate = async (req, res) => {
    try {
        await smsTemplateService.deleteSmsTemplate(req.params.id);
        res.status(200).json({ status: 'success', message: 'SMS template deleted successfully' });
    } catch (error) {
        console.error('Error deleting SMS template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete SMS template' });
    }
};

module.exports = {
    getSmsTemplates,
    getSmsTemplateById,
    createSmsTemplate,
    updateSmsTemplate,
    deleteSmsTemplate
};
