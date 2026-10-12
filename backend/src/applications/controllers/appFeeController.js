const appFeeService = require('../services/appFeeService');
const appFeeValidator = require('../validators/appFeeValidator');

class AppFeeController {
    /**
     * GET /api/app/fees/summary
     * Get overall fee status (Total Fee, Total Paid, Balance Due, Next Due Date)
     */
    async getSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const data = await appFeeService.getSummary(tenantId, userId);
            return res.status(200).json({
                success: true,
                message: 'Fee summary retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching fee summary'
            });
        }
    }

    /**
     * GET /api/app/fees/invoices
     * List of installment invoices (paid & pending) [Paginated]
     */
    async getInvoices(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;

            const validation = appFeeValidator.validateInvoicesQuery(req.query);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const data = await appFeeService.getInvoices(tenantId, userId, req.query);
            return res.status(200).json({
                success: true,
                message: 'Invoices retrieved successfully',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Internal server error while fetching invoices'
            });
        }
    }
}

module.exports = new AppFeeController();
