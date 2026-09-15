const otherIncomeService = require('../services/otherIncomeService');
const feeAccessService = require('../services/feeAccessService');

/**
 * Controller for Branch Other Income endpoints with strict branch-level scoping
 */
class OtherIncomeController {
  async getOtherIncomes(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;

      // Strict enforcement: If user is scoped to a specific branch, force that branchId
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const { search, startDate, endDate, paymentMode, page, limit, sortBy, sortOrder } = req.query;

      const result = await otherIncomeService.getOtherIncomes({
        tenantId,
        branchId,
        search,
        startDate,
        endDate,
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
      console.error('Error fetching other income records:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch other income records'
      });
    }
  }

  async getOtherIncomeById(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const record = await otherIncomeService.getOtherIncomeById({
        id: req.params.id,
        tenantId,
        branchId
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Other income record not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: record
      });
    } catch (err) {
      console.error('Error fetching other income record by ID:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch other income record'
      });
    }
  }

  async createOtherIncome(req, res) {
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
          message: 'branchId is required for recording other income'
        });
      }

      const {
        title,
        description,
        amount,
        incomeDate,
        paymentMode,
        referenceNumber,
        attachmentUrls
      } = req.body;

      const created = await otherIncomeService.createOtherIncome({
        tenantId,
        branchId: Number(branchId),
        title,
        description,
        amount,
        incomeDate,
        paymentMode,
        referenceNumber,
        attachmentUrls,
        createdBy: userId
      });

      return res.status(201).json({
        success: true,
        message: `Other income record ${created.income_record_number} created successfully`,
        data: created
      });
    } catch (err) {
      console.error('Error creating other income record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to create other income record'
      });
    }
  }

  async updateOtherIncome(req, res) {
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
        amount,
        incomeDate,
        paymentMode,
        referenceNumber,
        attachmentUrls
      } = req.body;

      const updated = await otherIncomeService.updateOtherIncome({
        id: req.params.id,
        tenantId,
        branchId: branchId ? Number(branchId) : undefined,
        title,
        description,
        amount,
        incomeDate,
        paymentMode,
        referenceNumber,
        attachmentUrls
      });

      return res.status(200).json({
        success: true,
        message: `Other income record ${updated.income_record_number} updated successfully`,
        data: updated
      });
    } catch (err) {
      console.error('Error updating other income record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update other income record'
      });
    }
  }

  async deleteOtherIncome(req, res) {
    try {
      const tenantId = req.user.tenantId || req.user.tenant_id;
      const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

      let branchId = req.query.branchId || req.query.branch_id;
      if (accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        branchId = accessContext.authorizedBranchId;
      }

      const result = await otherIncomeService.deleteOtherIncome({
        id: req.params.id,
        tenantId,
        branchId: branchId ? Number(branchId) : undefined
      });

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      console.error('Error deleting other income record:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete other income record'
      });
    }
  }
}

module.exports = new OtherIncomeController();


