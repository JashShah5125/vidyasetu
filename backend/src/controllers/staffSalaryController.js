const staffSalaryModel = require('../models/staffSalaryModel');
const feeAccessService = require('../services/feeAccessService');

/**
 * Controller for Branch Staff Salaries & Monthly Status
 */
class StaffSalaryController {
    /**
     * Helper to resolve tenant ID and access context
     */
    async _getAccessContext(req) {
        const tenantId = req.user?.tenantId || req.user?.tenant_id || 2;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        return { tenantId, accessContext };
    }

    /**
     * Page 1: GET /api/branch/finance/staff-salaries
     * Returns master list of staff salaries and effective dates
     */
    async getStaffSalaries(req, res) {
        try {
            const { tenantId, accessContext } = await this._getAccessContext(req);
            const { search, employeeType, branchId, page = 1, limit = 50 } = req.query;

            const result = await staffSalaryModel.getStaffSalariesMaster(
                tenantId,
                { search, employeeType, branchId, page, limit },
                accessContext
            );

            return res.status(200).json({
                success: true,
                message: 'Staff salary structure retrieved successfully.',
                data: result.data,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } catch (error) {
            console.error('Error in getStaffSalaries:', error);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve staff salary structure.'
            });
        }
    }

    /**
     * PUT /api/branch/finance/staff-salaries/:staffId
     * Updates staff basic monthly salary & effective from date
     */
    async updateStaffSalary(req, res) {
        try {
            const { tenantId, accessContext } = await this._getAccessContext(req);
            const staffId = req.params.staffId;
            const { salaryAmount, salaryType, salaryEffectiveFrom } = req.body;
            const updaterUserId = req.user?.userId || req.user?.id;

            if (salaryAmount === undefined || salaryAmount === null || isNaN(Number(salaryAmount)) || Number(salaryAmount) < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid, non-negative salary amount.'
                });
            }

            const result = await staffSalaryModel.updateStaffSalaryMaster(
                tenantId,
                staffId,
                { salaryAmount: Number(salaryAmount), salaryType, salaryEffectiveFrom },
                updaterUserId,
                accessContext
            );

            return res.status(200).json({
                success: true,
                message: 'Staff salary updated successfully.',
                data: result
            });
        } catch (error) {
            console.error('Error in updateStaffSalary:', error);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update staff salary.'
            });
        }
    }

    /**
     * Page 2: GET /api/branch/finance/staff-salaries/status
     * Returns dynamic monthly status (PAID vs PENDING) + aggregate summary KPIs
     */
    async getSalaryStatus(req, res) {
        try {
            const { tenantId, accessContext } = await this._getAccessContext(req);
            const now = new Date();
            const month = req.query.month ? parseInt(req.query.month, 10) : (now.getMonth() + 1);
            const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
            const { status = 'All', employeeType = 'All', search = '', branchId, page = 1, limit = 50 } = req.query;

            const result = await staffSalaryModel.getStaffSalaryStatus(
                tenantId,
                { month, year, status, employeeType, search, branchId, page, limit },
                accessContext
            );

            return res.status(200).json({
                success: true,
                message: `Salary status for ${month}/${year} retrieved successfully.`,
                data: result.data,
                summary: result.summary,
                period: result.period,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Error in getSalaryStatus:', error);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve monthly salary status.'
            });
        }
    }

    /**
     * POST /api/branch/finance/staff-salaries/:staffId/pay
     * Records a salary payment for a specific staff member and month/year
     */
    async paySalary(req, res) {
        try {
            const { tenantId, accessContext } = await this._getAccessContext(req);
            const staffId = req.params.staffId;
            const { salaryMonth, salaryYear, amount, paidDate, paymentMode, reference, remarks, branchId } = req.body;
            const creatorUserId = req.user?.userId || req.user?.id;

            if (!salaryMonth || !salaryYear) {
                return res.status(400).json({
                    success: false,
                    message: 'Salary month and year are required.'
                });
            }

            const result = await staffSalaryModel.payStaffSalary(
                tenantId,
                staffId,
                { salaryMonth, salaryYear, amount, paidDate, paymentMode, reference, remarks, branchId },
                creatorUserId,
                accessContext
            );

            return res.status(201).json({
                success: true,
                message: `Salary payment for ${result.salaryMonth}/${result.salaryYear} of ₹${result.amount.toLocaleString('en-IN')} recorded successfully.`,
                data: result
            });
        } catch (error) {
            console.error('Error in paySalary:', error);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to record salary payment.'
            });
        }
    }

    /**
     * Page 3 (Detail): GET /api/branch/finance/staff-salaries/:staffId/history
     * Returns staff salary profile and full chronological payment history
     */
    async getStaffSalaryHistory(req, res) {
        try {
            const { tenantId, accessContext } = await this._getAccessContext(req);
            const staffId = req.params.staffId;

            const result = await staffSalaryModel.getStaffSalaryHistory(tenantId, staffId, accessContext);

            return res.status(200).json({
                success: true,
                message: 'Staff salary history retrieved successfully.',
                data: result
            });
        } catch (error) {
            console.error('Error in getStaffSalaryHistory:', error);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve staff salary history.'
            });
        }
    }
}

module.exports = new StaffSalaryController();
