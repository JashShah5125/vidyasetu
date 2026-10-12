const appDoubtService = require('../services/appDoubtService');
const appDoubtValidator = require('../validators/appDoubtValidator');

class AppDoubtController {
    /**
     * GET /api/app/doubts
     * List student doubts with status & subject filters
     */
    async list(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const validation = appDoubtValidator.validateQuery(req.query);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appDoubtService.listDoubts(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                message: 'Doubts list retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching doubts'
            });
        }
    }

    /**
     * POST /api/app/doubts
     * Create a new doubt question with optional attachments
     */
    async create(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const files = req.files || [];

            const validation = appDoubtValidator.validateCreate(req.body, files);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appDoubtService.createDoubt(tenantId, userId, req.body, files);
            return res.status(201).json({
                success: true,
                message: data.message || 'Doubt created successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while creating doubt'
            });
        }
    }

    /**
     * GET /api/app/doubts/:id
     * Get doubt thread and messages
     */
    async getThread(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const doubtId = req.params.id;

            const validation = appDoubtValidator.validateId(doubtId);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appDoubtService.getDoubtThread(tenantId, userId, doubtId);
            return res.status(200).json({
                success: true,
                message: 'Doubt thread retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching doubt thread'
            });
        }
    }

    /**
     * POST /api/app/doubts/:id/messages
     * Reply in a doubt thread
     */
    async reply(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const doubtId = req.params.id;
            const files = req.files || [];

            const idValidation = appDoubtValidator.validateId(doubtId);
            if (!idValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: idValidation.errors
                });
            }

            const bodyValidation = appDoubtValidator.validateReply(req.body, files);
            if (!bodyValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: bodyValidation.errors
                });
            }

            const data = await appDoubtService.replyDoubt(tenantId, userId, doubtId, req.body, files);
            return res.status(200).json({
                success: true,
                message: data.message || 'Reply posted successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while posting reply'
            });
        }
    }
}

module.exports = new AppDoubtController();
