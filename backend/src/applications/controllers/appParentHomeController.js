const appParentHomeService = require('../services/appParentHomeService');

class AppParentHomeController {
    /**
     * GET /api/app/parent/home
     */
    async getHomeDashboard(req, res) {
        try {
            const result = await appParentHomeService.getHomeDashboard(req.user);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve parent home dashboard.'
            });
        }
    }

    /**
     * GET /api/app/parent/children
     */
    async getChildren(req, res) {
        try {
            const result = await appParentHomeService.getChildrenList(req.user);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve linked children list.'
            });
        }
    }

    /**
     * GET /api/app/parent/children/:studentId/overview
     */
    async getChildOverview(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentHomeService.getChildOverview(req.user, studentId);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve child overview.'
            });
        }
    }
}

module.exports = new AppParentHomeController();
