const platformSettingsService = require('../services/platformSettingsService');

const getSettings = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = 'general', status = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const result = await platformSettingsService.getSettings({
            limit: Number(limit),
            offset,
            search,
            category,
            status
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching platform settings:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getSettingById = async (req, res) => {
    try {
        const { id } = req.params;
        const setting = await platformSettingsService.getSettingById(id);
        if (!setting) {
            return res.status(404).json({ status: 'error', message: 'Setting not found' });
        }
        res.status(200).json({ status: 'success', data: setting });
    } catch (error) {
        console.error('Error fetching setting by id:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createSetting = async (req, res) => {
    try {
        const { category = 'general', key_name, value, is_secret = 0 } = req.body;
        if (!key_name || value === undefined) {
            return res.status(400).json({ status: 'error', message: 'Key name and value are required' });
        }
        const created = await platformSettingsService.createSetting({ category, key_name, value, is_secret });
        res.status(201).json({ status: 'success', data: created });
    } catch (error) {
        console.error('Error creating setting:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create setting' });
    }
};

const updateSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await platformSettingsService.updateSetting(id, req.body);
        if (!updated) {
            return res.status(404).json({ status: 'error', message: 'Setting not found' });
        }
        res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update setting' });
    }
};

const deleteSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await platformSettingsService.deleteSetting(id);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Setting not found' });
        }
        res.status(200).json({ status: 'success', message: 'Setting soft-deleted successfully' });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete setting' });
    }
};

module.exports = {
    getSettings,
    getSettingById,
    createSetting,
    updateSetting,
    deleteSetting
};
