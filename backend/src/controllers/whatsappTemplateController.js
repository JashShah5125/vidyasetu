const whatsappTemplateService = require('../services/whatsappTemplateService');

const getWhatsAppTemplates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await whatsappTemplateService.getWhatsAppTemplates({
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
        console.error('Error fetching WhatsApp templates:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const getWhatsAppTemplateById = async (req, res) => {
    try {
        const template = await whatsappTemplateService.getWhatsAppTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'WhatsApp template not found' });
        }
        res.status(200).json({ status: 'success', data: template });
    } catch (error) {
        console.error('Error fetching WhatsApp template:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};

const createWhatsAppTemplate = async (req, res) => {
    try {
        const template = await whatsappTemplateService.createWhatsAppTemplate(req.body);
        res.status(201).json({ status: 'success', data: template, message: 'WhatsApp template created successfully' });
    } catch (error) {
        console.error('Error creating WhatsApp template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create WhatsApp template' });
    }
};

const updateWhatsAppTemplate = async (req, res) => {
    try {
        const template = await whatsappTemplateService.updateWhatsAppTemplate(req.params.id, req.body);
        res.status(200).json({ status: 'success', data: template, message: 'WhatsApp template updated successfully' });
    } catch (error) {
        console.error('Error updating WhatsApp template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update WhatsApp template' });
    }
};

const deleteWhatsAppTemplate = async (req, res) => {
    try {
        await whatsappTemplateService.deleteWhatsAppTemplate(req.params.id);
        res.status(200).json({ status: 'success', message: 'WhatsApp template deleted successfully' });
    } catch (error) {
        console.error('Error deleting WhatsApp template:', error);
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete WhatsApp template' });
    }
};

module.exports = {
    getWhatsAppTemplates,
    getWhatsAppTemplateById,
    createWhatsAppTemplate,
    updateWhatsAppTemplate,
    deleteWhatsAppTemplate
};
