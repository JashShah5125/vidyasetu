const appParentFeeService = require('../services/appParentFeeService');

class AppParentFeeController {
    /**
     * GET /api/app/parent/children/:studentId/fees/summary
     */
    async getFeeSummary(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentFeeService.getFeeSummary(req.user.tenantId, studentId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/app/parent/children/:studentId/fees/invoices
     */
    async getInvoices(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentFeeService.getInvoices(req.user.tenantId, studentId, req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AppParentFeeController();
