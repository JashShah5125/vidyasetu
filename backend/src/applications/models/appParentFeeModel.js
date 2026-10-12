const pool = require('../../config/db');

class AppParentFeeModel {
    /**
     * Get student context with active enrollment & batch by studentId
     */
    async getStudentContext(tenantId, studentId) {
        const query = `
            SELECT 
                s.id AS student_id,
                s.student_code,
                s.full_name AS student_name,
                s.primary_branch_id,
                se.id AS enrollment_id,
                se.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                se.academic_year_id,
                ay.name AS academic_year_name,
                br.name AS branch_name
            FROM students s
            LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
            LEFT JOIN batches b ON b.id = se.batch_id AND b.deleted_at IS NULL
            LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.deleted_at IS NULL
            LEFT JOIN branches br ON br.id = s.primary_branch_id AND br.deleted_at IS NULL
            WHERE s.id = ? AND s.tenant_id = ? AND s.deleted_at IS NULL
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [studentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get primary fee assignment for student enrollment
     */
    async getFeeAssignment(tenantId, studentId, enrollmentId) {
        if (!enrollmentId) return null;
        const query = `
            SELECT 
                sfa.id AS assignment_id,
                sfa.fee_source_type,
                sfa.fee_source_id,
                sfa.gross_amount,
                sfa.total_concession,
                sfa.net_amount,
                sfa.down_payment,
                sfa.installment_count,
                sfa.installment_amount,
                sfa.paid_amount,
                sfa.balance_amount,
                sfa.status AS assignment_status,
                sfa.created_at,
                sfa.updated_at
            FROM student_fee_assignments sfa
            WHERE sfa.student_id = ? AND sfa.enrollment_id = ? AND sfa.tenant_id = ?
            ORDER BY sfa.id DESC
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [studentId, enrollmentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get next pending/overdue installment
     */
    async getNextDueInvoice(tenantId, studentId, enrollmentId) {
        if (!enrollmentId) return null;
        const query = `
            SELECT 
                id AS invoice_id,
                invoice_number,
                installment_number,
                description,
                due_date,
                amount,
                paid_amount,
                balance_due,
                status
            FROM student_invoices
            WHERE student_id = ? 
              AND enrollment_id = ? 
              AND tenant_id = ?
              AND status IN ('pending', 'partial', 'overdue')
            ORDER BY due_date ASC, installment_number ASC
            LIMIT 1
        `;
        const [rows] = await pool.query(query, [studentId, enrollmentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Get invoice counts by status
     */
    async getInvoiceStats(tenantId, studentId, enrollmentId) {
        if (!enrollmentId) {
            return { total_invoices: 0, paid_invoices: 0, pending_invoices: 0, overdue_invoices: 0 };
        }
        const query = `
            SELECT 
                COUNT(*) AS total_invoices,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_invoices,
                SUM(CASE WHEN status IN ('pending', 'partial') THEN 1 ELSE 0 END) AS pending_invoices,
                SUM(CASE WHEN status = 'overdue' OR (status IN ('pending', 'partial') AND due_date < CURDATE()) THEN 1 ELSE 0 END) AS overdue_invoices
            FROM student_invoices
            WHERE student_id = ? AND enrollment_id = ? AND tenant_id = ?
        `;
        const [rows] = await pool.query(query, [studentId, enrollmentId, tenantId]);
        return rows[0] || { total_invoices: 0, paid_invoices: 0, pending_invoices: 0, overdue_invoices: 0 };
    }

    /**
     * Get paginated installment invoices
     */
    async getInvoices(tenantId, studentId, enrollmentId, { status = null, page = 1, limit = 10 }) {
        if (!enrollmentId) {
            return { rows: [], total: 0 };
        }
        const offset = (Number(page) - 1) * Number(limit);
        const whereClauses = [
            'si.student_id = ?',
            'si.enrollment_id = ?',
            'si.tenant_id = ?'
        ];
        const params = [Number(studentId), Number(enrollmentId), Number(tenantId)];

        if (status) {
            const normalizedStatus = String(status).toLowerCase().trim();
            whereClauses.push('LOWER(si.status) = ?');
            params.push(normalizedStatus);
        }

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM student_invoices si
            WHERE ${whereClauses.join(' AND ')}
        `;
        const [countRows] = await pool.query(countQuery, params);
        const total = Number(countRows[0]?.total || 0);

        const query = `
            SELECT 
                si.id AS invoice_id,
                si.invoice_number,
                si.installment_number,
                si.description,
                si.issue_date,
                si.due_date,
                si.payment_date,
                si.amount,
                si.paid_amount,
                si.balance_due,
                si.payment_mode,
                si.transaction_reference,
                si.remarks,
                si.status,
                si.created_at
            FROM student_invoices si
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY si.installment_number ASC, si.due_date ASC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(query, [...params, Number(limit), Number(offset)]);
        return {
            rows,
            total
        };
    }
}

module.exports = new AppParentFeeModel();
