const platformSettingsModel = require('../models/platformSettingsModel');

const getSettings = async ({ limit = 10, offset = 0, search = '', category = 'general', status = '' }) => {
    return await platformSettingsModel.getSettings({ limit, offset, search, category, status });
};

const getSettingById = async (id) => {
    return await platformSettingsModel.getSettingById(id);
};

const createSetting = async (data) => {
    return await platformSettingsModel.createSetting(data);
};

const updateSetting = async (id, data) => {
    return await platformSettingsModel.updateSetting(id, data);
};

const deleteSetting = async (id) => {
    return await platformSettingsModel.deleteSetting(id);
};

module.exports = {
    getSettings,
    getSettingById,
    createSetting,
    updateSetting,
    deleteSetting
};
