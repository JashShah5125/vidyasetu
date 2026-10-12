const ALLOWED_STATUSES = ['pending', 'submitted', 'graded', 'overdue'];

class AppHomeworkValidator {
    validateQuery(query) {
        const errors = [];
        if (query.status && !ALLOWED_STATUSES.includes(String(query.status).toLowerCase().trim())) {
            errors.push(`Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
        }
        if (query.subjectId && isNaN(Number(query.subjectId))) {
            errors.push('subjectId must be a valid number.');
        }
        if (query.page && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
            errors.push('page must be a positive integer.');
        }
        if (query.limit && (isNaN(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
            errors.push('limit must be an integer between 1 and 100.');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateId(id) {
        const num = Number(id);
        if (isNaN(num) || num <= 0) {
            return {
                isValid: false,
                errors: ['Invalid homework ID. Must be a positive integer.']
            };
        }
        return { isValid: true, errors: [] };
    }

    validateSubmit(body, files = []) {
        const errors = [];
        const responseText = body.responseText ? String(body.responseText).trim() : '';

        if (!responseText && (!files || files.length === 0)) {
            errors.push('Please provide either written response text or upload at least one solution file.');
        }

        if (responseText && responseText.length > 5000) {
            errors.push('Response text cannot exceed 5000 characters.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new AppHomeworkValidator();
