const appScheduleService = require('../services/appScheduleService');

class AppScheduleController {
    /**
     * GET /api/app/schedule/today
     */
    async getTodaySchedule(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appScheduleService.getTodaySchedule(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppScheduleController.getTodaySchedule]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve today\'s schedule'
            });
        }
    }

    /**
     * GET /api/app/schedule/calendar
     */
    async getCalendarSchedule(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appScheduleService.getCalendarSchedule(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppScheduleController.getCalendarSchedule]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve calendar schedule'
            });
        }
    }

    /**
     * GET /api/app/schedule/lectures/:id
     */
    async getLectureDetails(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;
            const lectureId = req.params.id;

            const data = await appScheduleService.getLectureDetails(tenantId, userId, lectureId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppScheduleController.getLectureDetails]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve lecture details'
            });
        }
    }
}

module.exports = new AppScheduleController();
