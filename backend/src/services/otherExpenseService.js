const pool = require('../config/db');

/**
 * Service for managing branch other expenses (non-salary operational expenses)
 */
class OtherExpenseService {
  /**
   * Generates a human-friendly unique record number (e.g. OEX-2026-00001)
   */
  async generateRecordNumber(tenantId, expenseDate) {
    const year = new Date(expenseDate || Date.now()).getFullYear() || new Date().getFullYear();
    const prefix = `OEX-${year}-`;

    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM branch_other_expenses
       WHERE tenant_id = ? AND expense_record_number LIKE ?`,
      [tenantId, `${prefix}%`]
    );

    const nextSeq = (rows[0]?.count || 0) + 1;
    const formattedSeq = String(nextSeq).padStart(5, '0');
    let candidate = `${prefix}${formattedSeq}`;

    const [exists] = await pool.query(
      `SELECT id FROM branch_other_expenses WHERE tenant_id = ? AND expense_record_number = ? LIMIT 1`,
      [tenantId, candidate]
    );

    if (exists.length > 0) {
      candidate = `${prefix}${String(nextSeq + Math.floor(Math.random() * 900 + 100)).padStart(5, '0')}`;
    }

    return candidate;
  }

  /**
   * List other expense records with filtering, pagination and aggregate KPI stats
   */
  async getOtherExpenses({
    tenantId,
    branchId,
    search = '',
    startDate = '',
    endDate = '',
    category = '',
    status,
    paymentMode = 'ALL',
    page = 1,
    limit = 10,
    sortBy = 'expense_date',
    sortOrder = 'DESC'
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = ['boe.tenant_id = ?', 'boe.deleted_at IS NULL'];
    const params = [tenantId];

    if (branchId && branchId !== 'All' && branchId !== 'all') {
      whereClauses.push('boe.branch_id = ?');
      params.push(branchId);
    }

    if (paymentMode && paymentMode !== 'ALL' && paymentMode !== 'All') {
      whereClauses.push('boe.payment_mode = ?');
      params.push(paymentMode);
    }

    if (category && category !== 'All' && category !== 'all') {
      whereClauses.push('boe.category = ?');
      params.push(category);
    }

    if (status !== undefined && status !== null && status !== '' && status !== 'All' && status !== 'all') {
      whereClauses.push('boe.status = ?');
      params.push(Number(status));
    }

    if (startDate) {
      whereClauses.push('boe.expense_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('boe.expense_date <= ?');
      params.push(endDate);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push(
        '(boe.expense_record_number LIKE ? OR boe.title LIKE ? OR boe.description LIKE ? OR boe.reference_number LIKE ? OR boe.payee LIKE ?)'
      );
      params.push(s, s, s, s, s);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. KPI Summary Aggregates
    const summaryParams = [...params];
    const [summaryRows] = await pool.query(
      `SELECT
        COUNT(*) AS totalCount,
        COALESCE(SUM(boe.amount), 0) AS totalAmount,
        COALESCE(SUM(CASE WHEN boe.expense_date = CURDATE() THEN boe.amount ELSE 0 END), 0) AS todayAmount,
        COALESCE(SUM(CASE WHEN MONTH(boe.expense_date) = MONTH(CURDATE()) AND YEAR(boe.expense_date) = YEAR(CURDATE()) THEN boe.amount ELSE 0 END), 0) AS thisMonthAmount,
        COALESCE(SUM(CASE WHEN boe.status = 0 THEN boe.amount ELSE 0 END), 0) AS pendingAmount,
        COALESCE(SUM(CASE WHEN boe.status = 2 THEN boe.amount ELSE 0 END), 0) AS paidAmount
       FROM branch_other_expenses boe
       WHERE ${whereSql}`,
      summaryParams
    );

    const summary = {
      totalCount: Number(summaryRows[0]?.totalCount || 0),
      totalAmount: Number(summaryRows[0]?.totalAmount || 0),
      todayAmount: Number(summaryRows[0]?.todayAmount || 0),
      thisMonthAmount: Number(summaryRows[0]?.thisMonthAmount || 0),
      pendingAmount: Number(summaryRows[0]?.pendingAmount || 0),
      paidAmount: Number(summaryRows[0]?.paidAmount || 0)
    };

    // 2. Paginated Records
    const allowedSortFields = {
      'expense_date': 'boe.expense_date',
      'amount': 'boe.amount',
      'title': 'boe.title',
      'created_at': 'boe.created_at',
      'expense_record_number': 'boe.expense_record_number',
      'status': 'boe.status'
    };
    const sortField = allowedSortFields[sortBy] || 'boe.expense_date';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const listParams = [...params, limitNum, offset];
    const [records] = await pool.query(
      `SELECT
        boe.id,
        boe.tenant_id,
        boe.branch_id,
        boe.expense_record_number,
        boe.title,
        boe.category,
        boe.description,
        boe.amount,
        DATE_FORMAT(boe.expense_date, '%Y-%m-%d') as expense_date,
        boe.status,
        boe.payment_mode,
        boe.reference_number,
        boe.payee,
        boe.attachment_urls,
        boe.created_by,
        boe.created_at,
        boe.updated_at,
        b.name AS branch_name,
        u.name AS creator_name
       FROM branch_other_expenses boe
       LEFT JOIN branches b ON boe.branch_id = b.id
       LEFT JOIN users u ON boe.created_by = u.id
       WHERE ${whereSql}
       ORDER BY ${sortField} ${sortDir}, boe.id DESC
       LIMIT ? OFFSET ?`,
      listParams
    );

    const formattedRecords = records.map(r => ({
      ...r,
      amount: Number(r.amount) || 0,
      status: Number(r.status) || 0,
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
   * Get single other expense record by ID
   */
  async getOtherExpenseById({ id, tenantId, branchId }) {
    const whereClauses = ['boe.id = ?', 'boe.tenant_id = ?', 'boe.deleted_at IS NULL'];
    const params = [id, tenantId];

    if (branchId && branchId !== 'All') {
      whereClauses.push('boe.branch_id = ?');
      params.push(branchId);
    }

    const [rows] = await pool.query(
      `SELECT
        boe.id,
        boe.tenant_id,
        boe.branch_id,
        boe.expense_record_number,
        boe.title,
        boe.category,
        boe.description,
        boe.amount,
        DATE_FORMAT(boe.expense_date, '%Y-%m-%d') as expense_date,
        boe.status,
        boe.payment_mode,
        boe.reference_number,
        boe.payee,
        boe.attachment_urls,
        boe.created_by,
        boe.created_at,
        boe.updated_at,
        b.name AS branch_name,
        u.name AS creator_name
       FROM branch_other_expenses boe
       LEFT JOIN branches b ON boe.branch_id = b.id
       LEFT JOIN users u ON boe.created_by = u.id
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
      status: Number(record.status) || 0,
      attachment_urls: typeof record.attachment_urls === 'string' ? JSON.parse(record.attachment_urls || '[]') : (record.attachment_urls || [])
    };
  }

  /**
   * Create new other expense record
   */
  async createOtherExpense({
    tenantId,
    branchId,
    title,
    description = '',
    category = 'Other Expenses',
    amount,
    expenseDate,
    status = 0,
    paymentMode = 'bank_transfer',
    referenceNumber = '',
    payee = '',
    attachmentUrls = [],
    createdBy
  }) {
    if (!title || !title.trim()) {
      throw new Error('Expense title is required');
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Expense amount must be greater than zero');
    }

    const validExpenseDate = expenseDate || new Date().toISOString().split('T')[0];
    const recordNumber = await this.generateRecordNumber(tenantId, validExpenseDate);
    const attachmentsJson = JSON.stringify(Array.isArray(attachmentUrls) ? attachmentUrls : []);

    const [result] = await pool.query(
      `INSERT INTO branch_other_expenses
       (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        branchId,
        recordNumber,
        title.trim(),
        category || 'Other Expenses',
        description ? description.trim() : null,
        parsedAmount,
        validExpenseDate,
        Number(status) || 0,
        paymentMode || 'bank_transfer',
        referenceNumber ? referenceNumber.trim() : null,
        payee ? payee.trim() : null,
        attachmentsJson,
        createdBy || null
      ]
    );

    return this.getOtherExpenseById({ id: result.insertId, tenantId, branchId });
  }

  /**
   * Update existing other expense record
   */
  async updateOtherExpense({
    id,
    tenantId,
    branchId,
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
  }) {
    const existing = await this.getOtherExpenseById({ id, tenantId, branchId });
    if (!existing) {
      throw new Error('Other expense record not found or inaccessible');
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      if (!title || !title.trim()) throw new Error('Expense title cannot be empty');
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category || 'Other Expenses');
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Expense amount must be greater than zero');
      }
      updates.push('amount = ?');
      params.push(parsedAmount);
    }

    if (expenseDate !== undefined) {
      updates.push('expense_date = ?');
      params.push(expenseDate);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(Number(status));
    }

    if (paymentMode !== undefined) {
      updates.push('payment_mode = ?');
      params.push(paymentMode || 'bank_transfer');
    }

    if (referenceNumber !== undefined) {
      updates.push('reference_number = ?');
      params.push(referenceNumber ? referenceNumber.trim() : null);
    }

    if (payee !== undefined) {
      updates.push('payee = ?');
      params.push(payee ? payee.trim() : null);
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
      `UPDATE branch_other_expenses
       SET ${updates.join(', ')}
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      params
    );

    return this.getOtherExpenseById({ id, tenantId, branchId });
  }

  /**
   * Soft delete an other expense record
   */
  async deleteOtherExpense({ id, tenantId, branchId }) {
    const existing = await this.getOtherExpenseById({ id, tenantId, branchId });
    if (!existing) {
      throw new Error('Other expense record not found or inaccessible');
    }

    await pool.query(
      `UPDATE branch_other_expenses
       SET deleted_at = NOW(), status = 4
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );

    return { success: true, message: `Other expense record ${existing.expense_record_number} deleted successfully` };
  }
}

module.exports = new OtherExpenseService();
