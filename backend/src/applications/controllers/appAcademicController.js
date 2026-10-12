const appAcademicService = require('../services/appAcademicService');

class AppAcademicController {
    /**
     * GET /api/app/academic/enrollment
     */
    async getEnrollment(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAcademicService.getEnrollment(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAcademicController.getEnrollment]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve student academic enrollment'
            });
        }
    }

    /**
     * GET /api/app/academic/subjects
     */
    async getSubjects(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAcademicService.getSubjects(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAcademicController.getSubjects]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve enrolled subjects'
            });
        }
    }

    /**
     * GET /api/app/academic/faculty
     */
    async getFaculty(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAcademicService.getFaculty(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAcademicController.getFaculty]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve assigned faculty'
            });
        }
    }
}

module.exports = new AppAcademicController();
