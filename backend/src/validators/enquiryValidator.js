const Joi = require('joi');

const createEnquirySchema = Joi.object({
    preferred_branch_id: Joi.number().integer().required().messages({
        'any.required': 'Preferred branch is required',
        'number.base': 'Preferred branch must be a valid id'
    }),
    assigned_branch_id: Joi.number().integer().optional(),
    source: Joi.number().integer().min(0).max(8).default(0),
    status: Joi.number().integer().min(-2).max(7).default(0).optional(),
    student_name: Joi.string().trim().min(1).max(255).required().messages({
        'any.required': 'Student name is required',
        'string.empty': 'Student name is required'
    }),
    student_mobile: Joi.string().trim().min(7).max(20).required().messages({
        'any.required': 'Student mobile is required'
    }),
    student_email: Joi.string().email().allow(null, '').optional(),
    parent_name: Joi.string().trim().max(255).allow(null, '').optional(),
    parent_mobile: Joi.string().trim().max(20).allow(null, '').optional(),
    parent_email: Joi.string().email().allow(null, '').optional(),
    interested_course_id: Joi.number().integer().allow(null).optional(),
    interested_program_id: Joi.number().integer().allow(null).optional(),
    package_type: Joi.number().integer().min(1).max(3).allow(null).optional(),
    package_details: Joi.any().allow(null).optional(),
    interested_academic_year_id: Joi.number().integer().allow(null).optional(),
    interested_level_id: Joi.number().integer().allow(null).optional(),
    counsellor_id: Joi.number().integer().allow(null).optional(),
    remarks: Joi.string().allow(null, '').optional(),
    next_followup_at: Joi.date().allow(null).optional(),
    actual_price: Joi.number().min(0).allow(null).optional(),
    concession_amount: Joi.number().min(0).allow(null).optional(),
    final_price: Joi.number().min(0).allow(null).optional(),
    down_payment: Joi.number().min(0).allow(null).optional(),
    installment_months: Joi.number().integer().min(1).allow(null).optional(),
    counselling_notes: Joi.string().allow(null, '').optional()
}).unknown(true);

const updateEnquirySchema = Joi.object({
    preferred_branch_id: Joi.number().integer().optional(),
    assigned_branch_id: Joi.number().integer().optional(),
    source: Joi.number().integer().min(-2).max(8).optional(),
    status: Joi.number().integer().min(-2).max(7).optional(),
    student_name: Joi.string().trim().min(1).max(255).optional(),
    student_mobile: Joi.string().trim().max(20).optional(),
    student_email: Joi.string().email().allow(null, '').optional(),
    parent_name: Joi.string().trim().max(255).allow(null, '').optional(),
    parent_mobile: Joi.string().trim().max(20).allow(null, '').optional(),
    parent_email: Joi.string().email().allow(null, '').optional(),
    interested_course_id: Joi.number().integer().allow(null).optional(),
    interested_program_id: Joi.number().integer().allow(null).optional(),
    package_type: Joi.number().integer().min(1).max(3).allow(null).optional(),
    package_details: Joi.any().allow(null).optional(),
    interested_academic_year_id: Joi.number().integer().allow(null).optional(),
    interested_level_id: Joi.number().integer().allow(null).optional(),
    counsellor_id: Joi.number().integer().allow(null).optional(),
    lost_reason: Joi.string().allow(null, '').optional(),
    lost_at: Joi.date().allow(null).optional(),
    deleted_at: Joi.date().allow(null).optional(),
    demo_scheduled_at: Joi.date().allow(null).optional(),
    next_followup_at: Joi.date().allow(null).optional(),
    admission_confirmed_at: Joi.date().allow(null).optional(),
    actual_price: Joi.number().min(0).allow(null).optional(),
    concession_amount: Joi.number().min(0).allow(null).optional(),
    final_price: Joi.number().min(0).allow(null).optional(),
    down_payment: Joi.number().min(0).allow(null).optional(),
    installment_months: Joi.number().integer().min(1).allow(null).optional(),
    counselling_notes: Joi.string().allow(null, '').optional(),
    remarks: Joi.string().allow(null, '').optional(),
    log_notes: Joi.string().allow(null, '').optional()
}).unknown(true);

const convertEnquirySchema = Joi.object({
    full_name: Joi.string().trim().min(1).max(255).required().messages({
        'any.required': 'Student full name is required',
        'string.empty': 'Student full name cannot be empty'
    }),
    mobile: Joi.string().trim().min(7).max(20).required().messages({
        'any.required': 'Student mobile number is required',
        'string.empty': 'Student mobile number cannot be empty'
    }),
    email: Joi.string().email().required().messages({
        'any.required': 'Student email ID is required',
        'string.empty': 'Student email ID cannot be empty',
        'string.email': 'Student email ID must be a valid email'
    }),
    dob: Joi.date().iso().required().messages({
        'any.required': 'Date of birth is required',
        'date.base': 'Valid date of birth is required'
    }),
    gender: Joi.string().valid('Male', 'Female', 'Other').required().messages({
        'any.required': 'Gender is required',
        'any.only': 'Gender must be Male, Female, or Other'
    }),
    street: Joi.string().trim().min(1).max(255).required().messages({
        'any.required': 'Street address is required',
        'string.empty': 'Street address cannot be empty'
    }),
    city: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'City is required',
        'string.empty': 'City cannot be empty'
    }),
    state: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'State is required',
        'string.empty': 'State cannot be empty'
    }),
    pincode: Joi.string().trim().min(3).max(20).required().messages({
        'any.required': 'Pincode is required',
        'string.empty': 'Pincode cannot be empty'
    }),
    category: Joi.string().trim().max(50).default('General'),
    school_name: Joi.string().trim().min(1).max(255).required().messages({
        'any.required': 'School/College name is required',
        'string.empty': 'School/College name cannot be empty'
    }),
    current_class: Joi.string().trim().min(1).max(50).required().messages({
        'any.required': 'Current academic class/level is required',
        'string.empty': 'Current class cannot be empty'
    }),
    board: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Board is required',
        'string.empty': 'Board cannot be empty'
    }),
    target_exam: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Target exam is required',
        'string.empty': 'Target exam cannot be empty'
    }),
    year_of_attempt: Joi.string().trim().min(1).max(20).required().messages({
        'any.required': 'Target year of attempt is required',
        'string.empty': 'Target year of attempt cannot be empty'
    }),
    guardian_name: Joi.string().trim().min(1).max(255).required().messages({
        'any.required': 'Parent/Guardian name is required',
        'string.empty': 'Parent/Guardian name cannot be empty'
    }),
    guardian_mobile: Joi.string().trim().min(7).max(20).required().messages({
        'any.required': 'Parent/Guardian mobile is required',
        'string.empty': 'Parent/Guardian mobile cannot be empty'
    }),
    guardian_email: Joi.string().email().required().messages({
        'any.required': 'Parent/Guardian email is required',
        'string.empty': 'Parent/Guardian email cannot be empty',
        'string.email': 'Parent/Guardian email must be a valid email'
    }),
    guardian_relation: Joi.string().trim().min(1).max(50).required().messages({
        'any.required': 'Parent relation is required',
        'string.empty': 'Parent relation cannot be empty'
    }),
    guardian_occupation: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Parent occupation is required',
        'string.empty': 'Parent occupation cannot be empty'
    }),
    course: Joi.string().allow(null, '').optional(),
    program: Joi.string().allow(null, '').optional(),
    level: Joi.string().allow(null, '').optional(),
    gross_amount: Joi.number().min(0).allow(null).optional(),
    discount: Joi.number().min(0).allow(null).optional(),
    net_amount: Joi.number().min(0).allow(null).optional(),
    down_payment: Joi.number().min(0).allow(null).optional(),
    installments: Joi.number().integer().min(1).allow(null).optional(),
    installment_amount: Joi.number().min(0).allow(null).optional(),
    payment_mode: Joi.string().allow(null, '').optional(),
    board_id: Joi.number().integer().allow(null).optional(),
    batch_id: Joi.number().integer().allow(null).optional(),
    academic_year_id: Joi.number().integer().allow(null).optional(),
    subject_selection_type: Joi.string().allow(null, '').optional(),
    admission_mode: Joi.string().allow(null, '').optional(),
    status: Joi.number().integer().allow(null).optional(),
    documents: Joi.array().items(Joi.object().unknown(true)).allow(null).optional()
}).unknown(true);

const followupSchema = Joi.object({
    notes: Joi.string().trim().allow(null, '').optional(),
    next_followup_date: Joi.date().allow(null).optional()
});

module.exports = {
    createEnquirySchema,
    updateEnquirySchema,
    followupSchema,
    convertEnquirySchema
};