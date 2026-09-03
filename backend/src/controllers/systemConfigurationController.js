const systemConfigurationService = require('../services/systemConfigurationService');

const getConfig = async (req, res) => {
    try {
        const { channelType } = req.params;
        const tenantId = req.user.tenantId || 1;
        const config = await systemConfigurationService.getConfig(tenantId, channelType);
        if (!config) {
            return res.status(404).json({ status: 'error', message: `No configuration found for channel: ${channelType}` });
        }
        res.status(200).json({ status: 'success', data: config });
    } catch (error) {
        console.error('Error fetching system configuration:', error);
        if (error.code === 'INVALID_CHANNEL') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getAllConfigs = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || 1;
        const configs = await systemConfigurationService.getAllConfigs(tenantId);
        res.status(200).json({ status: 'success', data: configs });
    } catch (error) {
        console.error('Error fetching system configurations:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getProviders = async (req, res) => {
    try {
        const { channelType } = req.params;
        const tenantId = req.user.tenantId || 1;
        const providers = await systemConfigurationService.getProviders(tenantId, channelType);
        res.status(200).json({ status: 'success', data: providers });
    } catch (error) {
        console.error('Error fetching providers:', error);
        if (error.code === 'INVALID_CHANNEL') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const saveConfig = async (req, res) => {
    try {
        const { channelType } = req.params;
        const tenantId = req.user.tenantId || 1;
        const updatedBy = req.user.userId || null;

        const config = await systemConfigurationService.saveConfig(tenantId, channelType, req.body, updatedBy);
        res.status(200).json({ status: 'success', message: 'Configuration saved successfully', data: config });
    } catch (error) {
        console.error('Error saving system configuration:', error);
        if (error.code === 'INVALID_CHANNEL' || error.code === 'INVALID_CREDENTIALS') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const toggleConfig = async (req, res) => {
    try {
        const { channelType } = req.params;
        const { is_enabled } = req.body;
        const tenantId = req.user.tenantId || 1;
        const updatedBy = req.user.userId || null;

        const config = await systemConfigurationService.toggleConfig(tenantId, channelType, is_enabled, updatedBy);
        if (!config) {
            return res.status(404).json({ status: 'error', message: `No configuration found for channel: ${channelType}` });
        }
        res.status(200).json({ status: 'success', message: 'Configuration updated', data: config });
    } catch (error) {
        console.error('Error toggling system configuration:', error);
        if (error.code === 'INVALID_CHANNEL') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getConfig,
    getAllConfigs,
    getProviders,
    saveConfig,
    toggleConfig
};
