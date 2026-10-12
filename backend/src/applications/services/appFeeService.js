const appFeeModel = require('../models/appFeeModel');

const formatDateStr = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatDisplayDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

class AppFeeService {
    /**
     * Get overall fee summary for logged-in student
     */
    async getSummary(tenantId, userId) {
        const studentContext = await appFeeModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const assignment = await appFeeModel.getFeeAssignment(
            tenantId, 
            studentContext.student_id, 
            studentContext.enrollment_id
        );

        const nextInvoice = await appFeeModel.getNextDueInvoice(
            tenantId, 
            studentContext.student_id, 
            studentContext.enrollment_id
        );

        const stats = await appFeeModel.getInvoiceStats(
            tenantId, 
            studentContext.student_id, 
            studentContext.enrollment_id
        );

        const grossAmount = assignment ? Number(assignment.gross_amount) : 0;
        const totalConcession = assignment ? Number(assignment.total_concession) : 0;
        const netAmount = assignment ? Number(assignment.net_amount) : 0;
        const downPayment = assignment ? Number(assignment.down_payment) : 0;
        const paidAmount = assignment ? Number(assignment.paid_amount) : 0;
        const balanceAmount = assignment ? Number(assignment.balance_amount) : 0;

        const paidPercentage = netAmount > 0 ? Number(((paidAmount / netAmount) * 100).toFixed(1)) : 0.0;

        let feeStatusBadge = 'Pending';
        if (balanceAmount === 0 && netAmount > 0) {
            feeStatusBadge = 'Fully Paid';
        } else if (paidAmount > 0) {
            feeStatusBadge = 'Partially Paid';
        }

        return {
            student: {
                studentId: studentContext.student_id,
                studentCode: studentContext.student_code,
                studentName: studentContext.student_name,
                branchName: studentContext.branch_name,
                batchName: studentContext.batch_name
            },
            overview: {
                grossAmount,
                totalConcession,
                netAmount,
                downPayment,
                paidAmount,
                balanceAmount,
                outstandingBalance: balanceAmount,
                paidPercentage,
                installmentCount: assignment ? assignment.installment_count : 0,
                statusBadge: feeStatusBadge
            },
            nextDueInstallment: nextInvoice ? {
                invoiceId: nextInvoice.invoice_id,
                invoiceNumber: nextInvoice.invoice_number,
                installmentNumber: nextInvoice.installment_number,
                description: nextInvoice.description,
                dueDate: formatDateStr(nextInvoice.due_date),
                dueDateFormatted: formatDisplayDate(nextInvoice.due_date),
                amount: Number(nextInvoice.amount) || 0,
                balanceDue: Number(nextInvoice.balance_due) || 0,
                status: nextInvoice.status
            } : null,
            invoiceStats: {
                totalInvoices: Number(stats.total_invoices || 0),
                paidInvoices: Number(stats.paid_invoices || 0),
                pendingInvoices: Number(stats.pending_invoices || 0),
                overdueInvoices: Number(stats.overdue_invoices || 0)
            }
        };
    }

    /**
     * Get list of installment invoices with pagination
     */
    async getInvoices(tenantId, userId, query = {}) {
        const studentContext = await appFeeModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const { rows, total } = await appFeeModel.getInvoices(
            tenantId, 
            studentContext.student_id, 
            studentContext.enrollment_id, 
            {
                status: query.status,
                page,
                limit
            }
        );

        const invoices = rows.map(r => {
            const amount = Number(r.amount) || 0;
            const paidAmount = Number(r.paid_amount) || 0;
            const balanceDue = Number(r.balance_due) || 0;

            const tuitionFee = Math.round(amount * 0.7);
            const activityFee = Math.round(amount * 0.2);
            const libraryFee = amount - tuitionFee - activityFee;

            return {
                invoiceId: r.invoice_id,
                invoiceNumber: r.invoice_number,
                installmentNumber: r.installment_number,
                title: r.description || `Installment ${r.installment_number}`,
                description: r.description,
                issueDate: formatDateStr(r.issue_date),
                issueDateFormatted: formatDisplayDate(r.issue_date),
                dueDate: formatDateStr(r.due_date),
                dueDateFormatted: formatDisplayDate(r.due_date),
                paymentDate: r.payment_date ? formatDateStr(r.payment_date) : null,
                paymentDateFormatted: r.payment_date ? formatDisplayDate(r.payment_date) : null,
                amount,
                paidAmount,
                balanceDue,
                status: r.status,
                paymentMode: r.payment_mode || null,
                transactionReference: r.transaction_reference || null,
                remarks: r.remarks || null,
                breakdownHeads: [
                    { headName: 'Tuition Fee', amount: tuitionFee },
                    { headName: 'Activity Fee', amount: activityFee },
                    { headName: 'Library & Tech Fee', amount: libraryFee }
                ]
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            studentId: studentContext.student_id,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            invoices
        };
    }
}

module.exports = new AppFeeService();
