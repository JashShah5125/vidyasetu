const otherExpenseService = require('../services/otherExpenseService');
const feeAccessService = require('../services/feeAccessService');

/**
 * Controller for Branch Other Expense endpoints with strict branch-level scoping
 */
class OtherExpenseController {
  async getOtherExpenses(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;

      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const { search, startDate, endDate, category, status, paymentMode, page, limit, sortBy, sortOrder } = req.query;

      const result = await otherExpenseService.getOtherExpenses({
        tenantId,
        branchId,
        search,
        startDate,
        endDate,
        category,
        status,
        paymentMode,
        page,
        limit,
        sortBy,
        sortOrder
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('Error fetching other expense records:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch other expense records'
      });
    }
  }

  async getOtherExpenseById(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const record = await otherExpenseService.getOtherExpenseById({
        id: req.params.id,
        tenantId,
        branchId
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Other expense record not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: record
      });
    } catch (err) {
      console.error('Error fetching other expense record by ID:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch other expense record'
      });
    }
  }

  async createOtherExpense(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const userId = req.user.userId || req.user.id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.body.branchId || req.body.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'branchId is required for recording other expense'
        });
      }

      const {
        title,
        description,
        category,
        amount,
        expenseDate,
        status,
        paymentMode,
        referenceNumber,
        payee,
        attachmentUrls
      } = req.body;

      const created = await otherExpenseService.createOtherExpense({
        tenantId,
        branchId: Number(branchId),
        title,
        description,
        category,
        amount,
        expenseDate,
        status,
        paymentMode,
        referenceNumber,
        payee,
        attachmentUrls,
        createdBy: userId
      });

      return res.status(201).json({
        success: true,
        message: `Other expense record ${created.expense_record_number} created successfully`,
        data: created
      });
    } catch (err) {
      console.error('Error creating other expense record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to create other expense record'
      });
    }
  }

  async updateOtherExpense(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.body.branchId || req.body.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const {
        title,
        description,
        category,
        amount,
        expenseDate,
        status,
        paymentMode,
        referenceNumber,
        payee,
        attachmentUrls
      } = req.body;

      const updated = await otherExpenseService.updateOtherExpense({
        id: req.params.id,
        tenantId,
        branchId: branchId ? Number(branchId) : undefined,
        title,
        description,
        category,
        amount,
        expenseDate,
        status,
        paymentMode,
        referenceNumber,
        payee,
        attachmentUrls
      });

      return res.status(200).json({
        success: true,
        message: `Other expense record ${updated.expense_record_number} updated successfully`,
        data: updated
      });
    } catch (err) {
      console.error('Error updating other expense record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update other expense record'
      });
    }
  }

  async deleteOtherExpense(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const result = await otherExpenseService.deleteOtherExpense({
        id: req.params.id,
        tenantId,
        branchId: branchId ? Number(branchId) : undefined
      });

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      console.error('Error deleting other expense record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete other expense record'
      });
    }
  }
}

module.exports = new OtherExpenseController();
