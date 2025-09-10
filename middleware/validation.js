// middleware/validation.js
const Joi = require('joi');

// Validation schemas
const registerPelamarSchema = Joi.object({
    full_name: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    address: Joi.string().max(500).required(),
    date_of_birth: Joi.date().iso().required(),
    phone: Joi.string().max(20).optional()
});

const registerHRSchema = Joi.object({
    full_name: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    company_name: Joi.string().min(2).max(255).required(),
    company_address: Joi.string().max(500).required(),
    position: Joi.string().max(255).required(),
    phone: Joi.string().max(20).optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Validation middleware
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            const errorMessage = error.details[0].message;
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errorMessage
            });
        }
        
        next();
    };
};

module.exports = {
    validate,
    registerPelamarSchema,
    registerHRSchema,
    loginSchema
};