const appHomeworkService = require('../services/appHomeworkService');
const appHomeworkValidator = require('../validators/appHomeworkValidator');

class AppHomeworkController {
    /**
     * GET /api/app/homeworks
     * List homeworks for enrolled batch with status and subject filters
     */
    async list(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const validation = appHomeworkValidator.validateQuery(req.query);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appHomeworkService.list(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                message: 'Homework list retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching homeworks'
            });
        }
    }

    /**
     * GET /api/app/homeworks/:id
     * Get homework instructions, due date, teacher attachments, and current submission
     */
    async getDetails(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const homeworkId = req.params.id;

            const validation = appHomeworkValidator.validateId(homeworkId);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appHomeworkService.getDetails(tenantId, userId, homeworkId);
            return res.status(200).json({
                success: true,
                message: 'Homework details retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching homework details'
            });
        }
    }

    /**
     * POST /api/app/homeworks/:id/submit
     * Submit homework solution with text remarks and file attachments
     */
    async submit(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const homeworkId = req.params.id;

            const idValidation = appHomeworkValidator.validateId(homeworkId);
            if (!idValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: idValidation.errors
                });
            }

            const files = req.files || [];
            const bodyValidation = appHomeworkValidator.validateSubmit(req.body, files);
            if (!bodyValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: bodyValidation.errors
                });
            }

            const data = await appHomeworkService.submit(tenantId, userId, homeworkId, req.body, files);
            return res.status(200).json({
                success: true,
                message: data.message || 'Homework submitted successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while submitting homework'
            });
        }
    }

    /**
     * GET /api/app/homeworks/:id/my-submission
     * Get student's submission evaluation, teacher remarks, and grade
     */
    async getMySubmission(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const homeworkId = req.params.id;

            const validation = appHomeworkValidator.validateId(homeworkId);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appHomeworkService.getSubmission(tenantId, userId, homeworkId);
            return res.status(200).json({
                success: true,
                message: 'Submission details retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching submission details'
            });
        }
    }
}

module.exports = new AppHomeworkController();
