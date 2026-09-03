const Joi = require('joi');

const VALID_CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP'];

const smsCredentialsSchema = Joi.object({
    account_sid: Joi.string().allow('').optional(),
    auth_token: Joi.string().allow('').optional(),
    from_number: Joi.string().allow('').optional(),
    api_endpoint: Joi.string().allow('').optional(),
    test_phone: Joi.string().allow('').optional()
});

const emailCredentialsSchema = Joi.object({
    encryption: Joi.string().allow('').optional(),
    smtp_host: Joi.string().allow('').optional(),
    smtp_port: Joi.string().allow('').optional(),
    smtp_username: Joi.string().allow('').optional(),
    smtp_password: Joi.string().allow('').optional(),
    from_email: Joi.string().allow('').optional(),
    from_name: Joi.string().allow('').optional(),
    reply_to_email: Joi.string().allow('').optional(),
    test_email: Joi.string().allow('').optional()
});

const whatsappCredentialsSchema = Joi.object({
    auth_token: Joi.string().allow('').optional(),
    api_endpoint: Joi.string().allow('').optional(),
    webhook_url: Joi.string().allow('').optional(),
    webhook_verify_token: Joi.string().allow('').optional(),
    test_phone: Joi.string().allow('').optional()
});

// Maps a channel type to its credentials validation schema
const credentialsSchemaByChannel = {
    SMS: smsCredentialsSchema,
    EMAIL: emailCredentialsSchema,
    WHATSAPP: whatsappCredentialsSchema
};

const validateChannelType = (channelType) => VALID_CHANNELS.includes(channelType);

const upsertSchema = Joi.object({
    provider_name: Joi.string().max(50).required().messages({
        'string.empty': 'Provider name is required',
        'string.max': 'Provider name must not exceed 50 characters',
        'any.required': 'Provider name is required'
    }),
    is_enabled: Joi.boolean().optional(),
    credentials: Joi.object().required().messages({
        'object.base': 'Credentials must be an object',
        'any.required': 'Credentials are required'
    }),
    sender_id: Joi.string().max(50).allow(null, '').optional().messages({
        'string.max': 'Sender ID must not exceed 50 characters'
    })
});

const isEnabledSchema = Joi.object({
    is_enabled: Joi.boolean().required().messages({
        'any.required': 'is_enabled is required'
    })
});

// Validates the raw credentials against the channel-specific schema.
// Returns { error } or null.
const validateCredentials = (channelType, credentials) => {
    const schema = credentialsSchemaByChannel[channelType];
    if (!schema) {
        return { message: `Unsupported channel type: ${channelType}` };
    }
    const { error } = schema.validate(credentials || {}, { allowUnknown: true });
    return error ? { message: error.message } : null;
};

module.exports = {
    VALID_CHANNELS,
    validateChannelType,
    validateCredentials,
    upsertSchema,
    isEnabledSchema
};
