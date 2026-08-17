const Joi = require('joi');

const validate = (schema) => {
    return (req, res, next) => {
        // We validate the request body against the provided schema
        // abortEarly: false ensures we get all errors, not just the first one
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            // Map over the details to extract clean error messages
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errorMessages
            });
        }

        next();
    };
};

module.exports = validate;
