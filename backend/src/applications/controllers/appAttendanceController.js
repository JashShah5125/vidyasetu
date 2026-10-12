const appAttendanceService = require('../services/appAttendanceService');

class AppAttendanceController {
    /**
     * GET /api/app/attendance/summary
     */
    async getSummary(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAttendanceService.getSummary(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAttendanceController.getSummary]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve attendance summary'
            });
        }
    }

    /**
     * GET /api/app/attendance/history
     */
    async getHistory(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAttendanceService.getHistory(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAttendanceController.getHistory]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve attendance history'
            });
        }
    }

    /**
     * GET /api/app/attendance/subject-wise
     */
    async getSubjectWise(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appAttendanceService.getSubjectWise(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppAttendanceController.getSubjectWise]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve subject-wise attendance'
            });
        }
    }
}

module.exports = new AppAttendanceController();
