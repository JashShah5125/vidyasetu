const systemConfigurationModel = require('../models/systemConfigurationModel');
const { validateChannelType, validateCredentials } = require('../validators/systemConfigurationValidator');

const getConfig = async (tenantId, channelType) => {
    if (!validateChannelType(channelType)) {
        const err = new Error(`Unsupported channel type: ${channelType}`);
        err.code = 'INVALID_CHANNEL';
        throw err;
    }
    return await systemConfigurationModel.getByTenantAndChannel(tenantId, channelType);
};

const getAllConfigs = async (tenantId) => {
    return await systemConfigurationModel.getAllByTenant(tenantId);
};

const getProviders = async (tenantId, channelType) => {
    if (!validateChannelType(channelType)) {
        const err = new Error(`Unsupported channel type: ${channelType}`);
        err.code = 'INVALID_CHANNEL';
        throw err;
    }
    return await systemConfigurationModel.getProvidersByChannel(tenantId, channelType);
};

const saveConfig = async (tenantId, channelType, data, updatedBy) => {
    if (!validateChannelType(channelType)) {
        const err = new Error(`Unsupported channel type: ${channelType}`);
        err.code = 'INVALID_CHANNEL';
        throw err;
    }

    const credError = validateCredentials(channelType, data.credentials);
    if (credError) {
        const err = new Error(credError.message);
        err.code = 'INVALID_CREDENTIALS';
        throw err;
    }

    const existing = await systemConfigurationModel.getByTenantAndChannel(tenantId, channelType);

    const payload = {
        tenant_id: tenantId,
        channel_type: channelType,
        provider_name: data.provider_name,
        is_enabled: data.is_enabled !== undefined ? data.is_enabled : true,
        credentials: data.credentials || {},
        sender_id: data.sender_id !== undefined ? data.sender_id : '',
        updated_by: updatedBy || null
    };

    if (existing) {
        await systemConfigurationModel.update(existing.id, payload);
        return await systemConfigurationModel.getById(existing.id);
    }

    const id = await systemConfigurationModel.create(payload);
    return await systemConfigurationModel.getById(id);
};

const toggleConfig = async (tenantId, channelType, isEnabled, updatedBy) => {
    if (!validateChannelType(channelType)) {
        const err = new Error(`Unsupported channel type: ${channelType}`);
        err.code = 'INVALID_CHANNEL';
        throw err;
    }

    const existing = await systemConfigurationModel.getByTenantAndChannel(tenantId, channelType);
    if (!existing) {
        return null;
    }

    await systemConfigurationModel.updateIsEnabled(existing.id, isEnabled, updatedBy);
    return await systemConfigurationModel.getById(existing.id);
};

module.exports = {
    getConfig,
    getAllConfigs,
    getProviders,
    saveConfig,
    toggleConfig
};
