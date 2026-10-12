const ALLOWED_STATUSES = ['paid', 'pending', 'partial', 'overdue'];

class AppFeeValidator {
    validateInvoicesQuery(query) {
        const errors = [];
        if (query.status && !ALLOWED_STATUSES.includes(String(query.status).toLowerCase().trim())) {
            errors.push(`Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
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
}

module.exports = new AppFeeValidator();
