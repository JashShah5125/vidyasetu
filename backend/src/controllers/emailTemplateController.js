const emailTemplateService = require('../services/emailTemplateService');

const getTemplates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const result = await emailTemplateService.getTemplates(Number(limit), offset, search, category, status);
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
        console.error('Error fetching email templates:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await emailTemplateService.getTemplateById(id);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Email template not found' });
        }
        res.status(200).json({ status: 'success', data: template });
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createTemplate = async (req, res) => {
    try {
        const template = await emailTemplateService.createTemplate(req.body);
        res.status(201).json({ status: 'success', message: 'Email template created successfully', data: template });
    } catch (error) {
        console.error('Error creating email template:', error);
        if (error.code === 'DUPLICATE_KEY') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create email template' });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await emailTemplateService.updateTemplate(id, req.body);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Email template not found' });
        }
        res.status(200).json({ status: 'success', message: 'Email template updated successfully', data: template });
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update email template' });
    }
};

const updateTemplateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const template = await emailTemplateService.updateTemplateStatus(id, status);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Email template not found' });
        }
        res.status(200).json({ status: 'success', message: 'Email template status updated', data: template });
    } catch (error) {
        console.error('Error updating email template status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    updateTemplateStatus
};
