const Joi = require('joi');

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required'
    })
});

const updateProfileSchema = Joi.object({
    name: Joi.string().trim().min(1).max(255).required().messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 1 character',
        'string.max': 'Name must not exceed 255 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'string.empty': 'Current password is required',
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).required().messages({
        'string.empty': 'New password is required',
        'string.min': 'New password must be at least 8 characters',
        'any.required': 'New password is required'
    })
});

module.exports = {
    loginSchema,
    refreshTokenSchema,
    updateProfileSchema,
    changePasswordSchema
};
