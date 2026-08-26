const Joi = require('joi');

const VALID_CATEGORIES = ['AUTHENTICATION', 'ONBOARDING', 'TENANT', 'SUBSCRIPTION'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

const createTemplateSchema = Joi.object({
    template_key: Joi.string()
        .pattern(/^[A-Z][A-Z0-9_]*$/)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Template key is required',
            'string.pattern.base': 'Template key must contain only uppercase letters, numbers, and underscores, and start with a letter',
            'string.max': 'Template key must not exceed 100 characters',
            'any.required': 'Template key is required'
        }),
    name: Joi.string()
        .min(1)
        .max(150)
        .required()
        .messages({
            'string.empty': 'Template name is required',
            'string.min': 'Template name must be at least 1 character',
            'string.max': 'Template name must not exceed 150 characters',
            'any.required': 'Template name is required'
        }),
    description: Joi.string()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'Description must be a string'
        }),
    category: Joi.string()
        .valid(...VALID_CATEGORIES)
        .required()
        .messages({
            'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
            'any.required': 'Category is required'
        }),
    subject: Joi.string()
        .min(1)
        .max(500)
        .required()
        .messages({
            'string.empty': 'Email subject is required',
            'string.min': 'Email subject must be at least 1 character',
            'string.max': 'Email subject must not exceed 500 characters',
            'any.required': 'Email subject is required'
        }),
    html_body: Joi.string()
        .min(1)
        .required()
        .messages({
            'string.empty': 'HTML body is required',
            'any.required': 'HTML body is required'
        }),
    text_body: Joi.string()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'Plain text body must be a string'
        }),
    variables: Joi.object()
        .allow(null)
        .optional()
        .messages({
            'object.base': 'Variables must be a JSON object'
        }),
    status: Joi.string()
        .valid(...VALID_STATUSES)
        .optional()
        .default('ACTIVE')
        .messages({
            'any.only': `Status must be one of: ${VALID_STATUSES.join(', ')}`
        })
});

const updateTemplateSchema = Joi.object({
    template_key: Joi.forbidden().messages({
        'any.unknown': 'Template key cannot be changed'
    }),
    name: Joi.string()
        .min(1)
        .max(150)
        .optional()
        .messages({
            'string.min': 'Template name must be at least 1 character',
            'string.max': 'Template name must not exceed 150 characters'
        }),
    description: Joi.string()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'Description must be a string'
        }),
    category: Joi.string()
        .valid(...VALID_CATEGORIES)
        .optional()
        .messages({
            'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
        }),
    subject: Joi.string()
        .min(1)
        .max(500)
        .optional()
        .messages({
            'string.min': 'Email subject must be at least 1 character',
            'string.max': 'Email subject must not exceed 500 characters'
        }),
    html_body: Joi.string()
        .min(1)
        .optional()
        .messages({
            'string.min': 'HTML body cannot be empty'
        }),
    text_body: Joi.string()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'Plain text body must be a string'
        }),
    variables: Joi.object()
        .allow(null)
        .optional()
        .messages({
            'object.base': 'Variables must be a JSON object'
        }),
    status: Joi.string()
        .valid(...VALID_STATUSES)
        .optional()
        .messages({
            'any.only': `Status must be one of: ${VALID_STATUSES.join(', ')}`
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

const statusSchema = Joi.object({
    status: Joi.string()
        .valid(...VALID_STATUSES)
        .required()
        .messages({
            'any.only': `Status must be one of: ${VALID_STATUSES.join(', ')}`,
            'any.required': 'Status is required'
        })
});

module.exports = {
    createTemplateSchema,
    updateTemplateSchema,
    statusSchema
};
