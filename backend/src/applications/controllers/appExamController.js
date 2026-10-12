const appExamService = require('../services/appExamService');
const appExamValidator = require('../validators/appExamValidator');

class AppExamController {
    /**
     * GET /api/app/exams/upcoming
     * List upcoming scheduled exams with dates, timings, and syllabus topics
     */
    async getUpcoming(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const data = await appExamService.getUpcomingExams(tenantId, userId);
            return res.status(200).json({
                success: true,
                message: 'Upcoming exams retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching upcoming exams'
            });
        }
    }

    /**
     * GET /api/app/exams/results
     * List completed exam results (marks obtained, max marks, grade, pass/fail)
     */
    async getResults(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const validation = appExamValidator.validateResultsQuery(req.query);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appExamService.getExamResults(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                message: 'Exam results retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching exam results'
            });
        }
    }

    /**
     * GET /api/app/exams/results/:examId
     * Detailed exam score breakdown with teacher remarks
     */
    async getResultDetails(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const examId = req.params.examId;

            const validation = appExamValidator.validateId(examId);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appExamService.getExamResultDetails(tenantId, userId, examId);
            return res.status(200).json({
                success: true,
                message: 'Exam result details retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching exam result details'
            });
        }
    }
}

module.exports = new AppExamController();
