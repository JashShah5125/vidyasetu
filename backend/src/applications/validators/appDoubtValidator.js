const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'reopened'];

class AppDoubtValidator {
    validateCreate(body, files = []) {
        const errors = [];

        if (!body.subjectId || isNaN(Number(body.subjectId)) || Number(body.subjectId) <= 0) {
            errors.push('subjectId is required and must be a valid positive integer.');
        }

        const topic = body.topic ? String(body.topic).trim() : '';
        if (!topic || topic.length < 3 || topic.length > 255) {
            errors.push('topic is required and must be between 3 and 255 characters.');
        }

        const message = body.message ? String(body.message).trim() : '';
        if (!message && (!files || files.length === 0)) {
            errors.push('message or at least one attachment file is required to create a doubt.');
        }

        if (message && message.length > 5000) {
            errors.push('message cannot exceed 5000 characters.');
        }

        if (body.assignedTeacherId && (isNaN(Number(body.assignedTeacherId)) || Number(body.assignedTeacherId) <= 0)) {
            errors.push('assignedTeacherId must be a valid positive integer if provided.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateReply(body, files = []) {
        const errors = [];
        const message = body.message ? String(body.message).trim() : '';

        if (!message && (!files || files.length === 0)) {
            errors.push('message or at least one attachment file is required to reply.');
        }

        if (message && message.length > 5000) {
            errors.push('message cannot exceed 5000 characters.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateQuery(query) {
        const errors = [];
        if (query.status && !ALLOWED_STATUSES.includes(String(query.status).toLowerCase().trim())) {
            errors.push(`Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
        }
        if (query.subjectId && (isNaN(Number(query.subjectId)) || Number(query.subjectId) <= 0)) {
            errors.push('subjectId must be a positive integer.');
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
                errors: ['Invalid doubt ID. Must be a positive integer.']
            };
        }
        return { isValid: true, errors: [] };
    }
}

module.exports = new AppDoubtValidator();
