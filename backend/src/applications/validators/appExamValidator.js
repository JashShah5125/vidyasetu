class AppExamValidator {
    validateId(id) {
        const num = Number(id);
        if (isNaN(num) || num <= 0) {
            return {
                isValid: false,
                errors: ['Invalid exam ID. Must be a positive integer.']
            };
        }
        return { isValid: true, errors: [] };
    }

    validateResultsQuery(query) {
        const errors = [];
        if (query.subjectId && (isNaN(Number(query.subjectId)) || Number(query.subjectId) <= 0)) {
            errors.push('subjectId must be a positive integer.');
        }
        if (query.academicYearId && (isNaN(Number(query.academicYearId)) || Number(query.academicYearId) <= 0)) {
            errors.push('academicYearId must be a positive integer.');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new AppExamValidator();
