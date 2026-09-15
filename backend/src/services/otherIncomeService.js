const pool = require('../config/db');

/**
 * Service for managing branch other income (non-student fee revenue)
 */
class OtherIncomeService {
  /**
   * Generates a human-friendly unique record number (e.g. OIN-2026-00001)
   */
  async generateRecordNumber(tenantId, incomeDate) {
    const year = new Date(incomeDate || Date.now()).getFullYear() || new Date().getFullYear();
    const prefix = `OIN-${year}-`;
    
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM branch_other_income 
       WHERE tenant_id = ? AND income_record_number LIKE ?`,
      [tenantId, `${prefix}%`]
    );
    
    const nextSeq = (rows[0]?.count || 0) + 1;
    const formattedSeq = String(nextSeq).padStart(5, '0');
    let candidate = `${prefix}${formattedSeq}`;

    // Verify uniqueness
    const [exists] = await pool.query(
      `SELECT id FROM branch_other_income WHERE tenant_id = ? AND income_record_number = ? LIMIT 1`,
      [tenantId, candidate]
    );

    if (exists.length > 0) {
      // Add random offset if collision
      candidate = `${prefix}${String(nextSeq + Math.floor(Math.random() * 900 + 100)).padStart(5, '0')}`;
    }

    return candidate;
  }

  /**
   * List other income records with filtering, pagination and aggregate KPI stats
   */
  async getOtherIncomes({
    tenantId,
    branchId,
    search = '',
    startDate = '',
    endDate = '',
    paymentMode = 'ALL',
    page = 1,
    limit = 10,
    sortBy = 'income_date',
    sortOrder = 'DESC'
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = ['boi.tenant_id = ?', 'boi.deleted_at IS NULL'];
    const params = [tenantId];

    if (branchId && branchId !== 'All' && branchId !== 'all') {
      whereClauses.push('boi.branch_id = ?');
      params.push(branchId);
    }

    if (paymentMode && paymentMode !== 'ALL' && paymentMode !== 'All') {
      whereClauses.push('boi.payment_mode = ?');
      params.push(paymentMode);
    }

    if (startDate) {
      whereClauses.push('boi.income_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('boi.income_date <= ?');
      params.push(endDate);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push(
        '(boi.income_record_number LIKE ? OR boi.title LIKE ? OR boi.description LIKE ? OR boi.reference_number LIKE ?)'
      );
      params.push(s, s, s, s);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. KPI Summary Aggregates
    const summaryParams = [...params];
    const [summaryRows] = await pool.query(
      `SELECT 
        COUNT(*) AS totalCount,
        COALESCE(SUM(boi.amount), 0) AS totalAmount,
        COALESCE(SUM(CASE WHEN boi.income_date = CURDATE() THEN boi.amount ELSE 0 END), 0) AS todayAmount,
        COALESCE(SUM(CASE WHEN MONTH(boi.income_date) = MONTH(CURDATE()) AND YEAR(boi.income_date) = YEAR(CURDATE()) THEN boi.amount ELSE 0 END), 0) AS thisMonthAmount
       FROM branch_other_income boi
       WHERE ${whereSql}`,
      summaryParams
    );

    const summary = {
      totalCount: Number(summaryRows[0]?.totalCount || 0),
      totalAmount: Number(summaryRows[0]?.totalAmount || 0),
      todayAmount: Number(summaryRows[0]?.todayAmount || 0),
      thisMonthAmount: Number(summaryRows[0]?.thisMonthAmount || 0)
    };

    // 2. Paginated Records
    const allowedSortFields = {
      'income_date': 'boi.income_date',
      'amount': 'boi.amount',
      'title': 'boi.title',
      'created_at': 'boi.created_at',
      'income_record_number': 'boi.income_record_number'
    };
    const sortField = allowedSortFields[sortBy] || 'boi.income_date';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const listParams = [...params, limitNum, offset];
    const [records] = await pool.query(
      `SELECT 
        boi.id,
        boi.tenant_id,
        boi.branch_id,
        boi.income_record_number,
        boi.title,
        boi.description,
        boi.amount,
        DATE_FORMAT(boi.income_date, '%Y-%m-%d') as income_date,
        boi.payment_mode,
        boi.reference_number,
        boi.attachment_urls,
        boi.created_by,
        boi.created_at,
        boi.updated_at,
        b.name AS branch_name,
        u.name AS creator_name
       FROM branch_other_income boi
       LEFT JOIN branches b ON boi.branch_id = b.id
       LEFT JOIN users u ON boi.created_by = u.id
       WHERE ${whereSql}
       ORDER BY ${sortField} ${sortDir}, boi.id DESC
       LIMIT ? OFFSET ?`,
      listParams
    );

    // Format attachment URLs if stored as JSON/string
    const formattedRecords = records.map(r => ({
      ...r,
      amount: Number(r.amount) || 0,
      attachment_urls: typeof r.attachment_urls === 'string' ? JSON.parse(r.attachment_urls || '[]') : (r.attachment_urls || [])
    }));

    return {
      records: formattedRecords,
      total: summary.totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(summary.totalCount / limitNum) || 1,
      summary
    };
  }

  /**
   * Get single other income record by ID
   */
  async getOtherIncomeById({ id, tenantId, branchId }) {
    const whereClauses = ['boi.id = ?', 'boi.tenant_id = ?', 'boi.deleted_at IS NULL'];
    const params = [id, tenantId];

    if (branchId && branchId !== 'All') {
      whereClauses.push('boi.branch_id = ?');
      params.push(branchId);
    }

    const [rows] = await pool.query(
      `SELECT 
        boi.id,
        boi.tenant_id,
        boi.branch_id,
        boi.income_record_number,
        boi.title,
        boi.description,
        boi.amount,
        DATE_FORMAT(boi.income_date, '%Y-%m-%d') as income_date,
        boi.payment_mode,
        boi.reference_number,
        boi.attachment_urls,
        boi.created_by,
        boi.created_at,
        boi.updated_at,
        b.name AS branch_name,
        u.name AS creator_name
       FROM branch_other_income boi
       LEFT JOIN branches b ON boi.branch_id = b.id
       LEFT JOIN users u ON boi.created_by = u.id
       WHERE ${whereClauses.join(' AND ')}
       LIMIT 1`,
      params
    );

    if (rows.length === 0) {
      return null;
    }

    const record = rows[0];
    return {
      ...record,
      amount: Number(record.amount) || 0,
      attachment_urls: typeof record.attachment_urls === 'string' ? JSON.parse(record.attachment_urls || '[]') : (record.attachment_urls || [])
    };
  }

  /**
   * Create new other income record
   */
  async createOtherIncome({
    tenantId,
    branchId,
    title,
    description = '',
    amount,
    incomeDate,
    paymentMode = 'bank_transfer',
    referenceNumber = '',
    attachmentUrls = [],
    createdBy
  }) {
    if (!title || !title.trim()) {
      throw new Error('Income title is required');
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Income amount must be greater than zero');
    }

    const validIncomeDate = incomeDate || new Date().toISOString().split('T')[0];
    const recordNumber = await this.generateRecordNumber(tenantId, validIncomeDate);
    const attachmentsJson = JSON.stringify(Array.isArray(attachmentUrls) ? attachmentUrls : []);

    const [result] = await pool.query(
      `INSERT INTO branch_other_income 
       (tenant_id, branch_id, income_record_number, title, description, amount, income_date, payment_mode, reference_number, attachment_urls, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        branchId,
        recordNumber,
        title.trim(),
        description ? description.trim() : null,
        parsedAmount,
        validIncomeDate,
        paymentMode || 'bank_transfer',
        referenceNumber ? referenceNumber.trim() : null,
        attachmentsJson,
        createdBy || null
      ]
    );

    return this.getOtherIncomeById({ id: result.insertId, tenantId, branchId });
  }

  /**
   * Update existing other income record
   */
  async updateOtherIncome({
    id,
    tenantId,
    branchId,
    title,
    description,
    amount,
    incomeDate,
    paymentMode,
    referenceNumber,
    attachmentUrls
  }) {
    const existing = await this.getOtherIncomeById({ id, tenantId, branchId });
    if (!existing) {
      throw new Error('Other income record not found or inaccessible');
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      if (!title || !title.trim()) throw new Error('Income title cannot be empty');
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Income amount must be greater than zero');
      }
      updates.push('amount = ?');
      params.push(parsedAmount);
    }

    if (incomeDate !== undefined) {
      updates.push('income_date = ?');
      params.push(incomeDate);
    }

    if (paymentMode !== undefined) {
      updates.push('payment_mode = ?');
      params.push(paymentMode || 'bank_transfer');
    }

    if (referenceNumber !== undefined) {
      updates.push('reference_number = ?');
      params.push(referenceNumber ? referenceNumber.trim() : null);
    }

    if (attachmentUrls !== undefined) {
      updates.push('attachment_urls = ?');
      params.push(JSON.stringify(Array.isArray(attachmentUrls) ? attachmentUrls : []));
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id, tenantId);
    await pool.query(
      `UPDATE branch_other_income 
       SET ${updates.join(', ')} 
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      params
    );

    return this.getOtherIncomeById({ id, tenantId, branchId });
  }

  /**
   * Soft delete an other income record
   */
  async deleteOtherIncome({ id, tenantId, branchId }) {
    const existing = await this.getOtherIncomeById({ id, tenantId, branchId });
    if (!existing) {
      throw new Error('Other income record not found or inaccessible');
    }

    await pool.query(
      `UPDATE branch_other_income 
       SET deleted_at = NOW() 
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );

    return { success: true, message: `Other income record ${existing.income_record_number} deleted successfully` };
  }
}

module.exports = new OtherIncomeService();
