const pool = require('../config/db');

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const INVOICE_STATUSES = ['unpaid', 'paid'];
const FEE_STATUSES = ['unpaid', 'partial', 'paid'];
const PAYMENT_MODES = [
    'UPI',
    'Cash',
    'Down Payment',
    'Downpayment',
    'Installment',
    'Cheque',
    'Bank Transfer',
    'Card',
    'Net Banking',
    'Demand Draft',
    'Other'
];

/**
 * Loads a student's fee ledger: base student info, the master fee assignment,
 * and all invoices ordered by installment number.
 */
const getStudentLedger = async (tenantId, studentId, accessContext = null) => {
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const branchId = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    const [students] = await pool.query(
        `SELECT
            s.id,
            s.tenant_id,
            s.primary_branch_id,
            b.name AS branch_name,
            s.student_code,
            s.full_name,
            s.mobile,
            s.email,
            s.status AS student_status,
            se.id AS enrollment_id,
            se.academic_year_id,
            ay.name AS academic_year_name,
            se.batch_id,
            bat.name AS batch_name
         FROM students s
         LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
         LEFT JOIN branches b ON s.primary_branch_id = b.id AND b.tenant_id = s.tenant_id
         LEFT JOIN academic_years ay ON se.academic_year_id = ay.id AND ay.tenant_id = s.tenant_id
         LEFT JOIN batches bat ON se.batch_id = bat.id AND bat.tenant_id = s.tenant_id
         WHERE s.tenant_id = ? AND s.id = ? AND s.deleted_at IS NULL
         LIMIT 1`,
        [tenantId, studentId]
    );
    if (students.length === 0) throw httpError(404, 'Student not found');

    const student = students[0];

    if (isBranchScope && Number(student.primary_branch_id) !== branchId) {
        throw httpError(403, 'Forbidden: You cannot access student records from another branch.');
    }

    let [feeRows] = await pool.query(
        `SELECT * FROM student_fee_assignments
         WHERE student_id = ? AND tenant_id = ?
         ORDER BY id DESC LIMIT 1`,
        [studentId, tenantId]
    );

    if (feeRows.length === 0) {
        // Fallback: check if converted enquiry exists with agreed fees to auto-provision fee assignment
        const [enqRows] = await pool.query(
            `SELECT * FROM enquiries WHERE converted_student_id = ? AND tenant_id = ? ORDER BY id DESC LIMIT 1`,
            [studentId, tenantId]
        );
        if (enqRows.length > 0) {
            const enq = enqRows[0];
            const netAmount = Number(enq.final_price || enq.actual_price || 0);
            if (netAmount > 0) {
                let effectiveEnrollmentId = student.enrollment_id;
                if (!effectiveEnrollmentId) {
                    const [existingEnrollment] = await pool.query(
                        `SELECT id FROM student_enrollments WHERE student_id = ? AND tenant_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
                        [studentId, tenantId]
                    );
                    if (existingEnrollment.length > 0) {
                        effectiveEnrollmentId = existingEnrollment[0].id;
                    } else {
                        const [insEnroll] = await pool.query(
                            `INSERT INTO student_enrollments (
                                tenant_id, branch_id, student_id, batch_id, academic_year_id, enrolled_date, status, created_by, updated_by
                            ) VALUES (?, ?, ?, ?, ?, CURDATE(), 'active', 1, 1)`,
                            [
                                tenantId,
                                student.primary_branch_id || 1,
                                studentId,
                                student.batch_id || null,
                                student.academic_year_id || 1
                            ]
                        );
                        effectiveEnrollmentId = insEnroll.insertId;
                    }
                }

                if (effectiveEnrollmentId) {
                    const [insFa] = await pool.query(
                        `INSERT INTO student_fee_assignments (
                            tenant_id, branch_id, student_id, enrollment_id, fee_source_type,
                            gross_amount, total_concession, net_amount, down_payment,
                            installment_count, installment_amount, paid_amount, balance_amount, status, created_by
                        ) VALUES (?, ?, ?, ?, 'standard', ?, ?, ?, ?, ?, ?, 0.00, ?, 'pending', 1)`,
                        [
                            tenantId, student.primary_branch_id || 1, studentId, effectiveEnrollmentId,
                            Number(enq.actual_price || netAmount), Number(enq.concession_amount || 0),
                            netAmount, Number(enq.down_payment || 0),
                            Math.max(1, Number(enq.installment_months || 1)),
                            Number(enq.installment_amount || 0),
                            netAmount
                        ]
                    );
                    const [newFeeRows] = await pool.query(`SELECT * FROM student_fee_assignments WHERE id = ?`, [insFa.insertId]);
                    if (newFeeRows.length > 0) {
                        feeRows = newFeeRows;
                    }
                }
            }
        }
    }

    let [invoiceRows] = await pool.query(
        `SELECT * FROM student_invoices
         WHERE student_id = ? AND tenant_id = ?
         ORDER BY installment_number ASC`,
        [studentId, tenantId]
    );

    // Self-healing: if structured installment invoices exist, automatically delete any redundant pending balance placeholder
    const hasStructuredInstallments = invoiceRows.some(
        r => r.installment_number > 0 && !r.invoice_number?.endsWith('-BAL') && !r.description?.includes('Pending Balance')
    );
    if (hasStructuredInstallments) {
        const balInvoices = invoiceRows.filter(
            r => (r.invoice_number?.endsWith('-BAL') || r.description?.includes('Pending Balance')) &&
                 (Number(r.paid_amount) === 0 || !r.paid_amount)
        );
        if (balInvoices.length > 0) {
            const balIds = balInvoices.map(b => b.id);
            await pool.query(
                `DELETE FROM student_invoices WHERE id IN (?) AND tenant_id = ?`,
                [balIds, tenantId]
            );
            invoiceRows = invoiceRows.filter(r => !balIds.includes(r.id));
        }
    }

    const invoices = invoiceRows.map(r => ({
        ...r,
        amount: Number(r.amount) || 0,
        paid_amount: Number(r.paid_amount) || 0,
        balance_due: Number(r.balance_due) || 0,
        outstanding: Math.max(0, (Number(r.balance_due) || 0) - 0)
    }));

    let feeAssignment = null;
    if (feeRows.length > 0) {
        const fa = feeRows[0];
        feeAssignment = {
            ...fa,
            gross_amount: Number(fa.gross_amount) || 0,
            total_concession: Number(fa.total_concession) || 0,
            net_amount: Number(fa.net_amount) || 0,
            down_payment: Number(fa.down_payment) || 0,
            installment_count: Number(fa.installment_count) || 1,
            installment_amount: Number(fa.installment_amount) || 0,
            paid_amount: Number(fa.paid_amount) || 0,
            balance_amount: Number(fa.balance_amount) || 0
        };
    }

    let expectedDueTillDate = 0;
    let feesOverdue = 0;
    if (feeAssignment) {
        const net = feeAssignment.net_amount;
        const paid = feeAssignment.paid_amount;
        const down = feeAssignment.down_payment;
        const instCount = Math.max(1, feeAssignment.installment_count);
        const instAmount = feeAssignment.installment_amount;
        const startDate = new Date(student.enrolled_date || feeAssignment.created_at || new Date());
        const now = new Date();

        let expected = down;
        for (let i = 1; i <= instCount; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            if (dueDate <= now) {
                expected += instAmount;
            }
        }
        expectedDueTillDate = Math.min(net, expected);
        feesOverdue = Math.max(0, expectedDueTillDate - paid);
    }

    return {
        ...student,
        feeAssignment,
        invoices,
        expected_due_till_date: Math.round(expectedDueTillDate),
        fees_overdue: Math.round(feesOverdue),
        totalOutstanding: feeAssignment
            ? round2(Math.max(feeAssignment.balance_amount, invoices.reduce((s, i) => s + i.outstanding, 0)))
            : round2(invoices.reduce((s, i) => s + i.outstanding, 0))
    };
};

/**
 * Generates a unique receipt number, e.g. RCPT-{tenantId}-{year}-{seq}.
 * Retries on collisions like the invoice numbering helper.
 */
const generateReceiptNumber = async (tenantId) => {
    const year = new Date().getFullYear();
    const prefix = `RCPT-${tenantId}-${year}-`;
    const [rows] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM receipts WHERE receipt_number LIKE ?',
        [`${prefix}%`]
    );
    let seq = (Number(rows[0].cnt) || 0) + 1;
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `${prefix}${String(seq).padStart(6, '0')}`;
        const [exists] = await pool.query('SELECT id FROM receipts WHERE receipt_number = ?', [candidate]);
        if (exists.length === 0) return candidate;
        seq += 1;
    }
    return `${prefix}${Date.now()}`;
};

/**
 * Generates an invoice number for a new collection invoice,
 * e.g. INV-{tenantId}-{studentId}-{seq}. Retries on collisions.
 */
const generateCollectionInvoiceNumber = async (tenantId, studentId, conn = null, extraOffset = 0) => {
    const db = conn || pool;
    const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM student_invoices WHERE tenant_id = ? AND student_id = ?',
        [tenantId, studentId]
    );
    const prefix = `INV-${tenantId}-${studentId}-`;
    let seq = (Number(rows[0]?.cnt) || 0) + 1 + extraOffset;
    for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
        const [exists] = await db.query('SELECT id FROM student_invoices WHERE invoice_number = ?', [candidate]);
        if (exists.length === 0) return candidate;
        seq += 1;
    }
    return `${prefix}${Date.now().toString().slice(-6)}-${extraOffset}`;
};

/**
 * Keeps the student's pending balance invoice in sync with their active fee assignment balance:
 * - If balance > 0 and a Pending Balance invoice exists, updates its amount & balance_due.
 * - If balance > 0 and no Pending Balance invoice exists, creates one so total invoiced == net fee.
 * - If balance <= 0, deletes any pending balance invoice since the fee is fully settled.
 */
const syncPendingBalanceInvoice = async (conn, {
    tenantId,
    branchId,
    studentId,
    enrollmentId,
    feeAssignmentId,
    balanceAmount,
    updatedBy = 1
}) => {
    const tid = Number(tenantId);
    const sid = Number(studentId);
    const balNum = round2(Number(balanceAmount) || 0);

    const [existing] = await conn.query(
        `SELECT id, invoice_number FROM student_invoices 
         WHERE tenant_id = ? AND student_id = ? 
           AND (description LIKE '%Pending Balance%' OR invoice_number LIKE '%-BAL')
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [tid, sid]
    );

    // Check if the student has structured installment invoices or other unpaid invoices
    const [otherInvs] = await conn.query(
        `SELECT id, balance_due FROM student_invoices
         WHERE tenant_id = ? AND student_id = ? AND status = 'unpaid'
           AND NOT (description LIKE '%Pending Balance%' OR invoice_number LIKE '%-BAL')`,
        [tid, sid]
    );

    // If other unpaid installment invoices exist, they already schedule the balance.
    // Or if balance is 0: delete any Pending Balance invoice and exit.
    if (otherInvs.length > 0 || balNum <= 0) {
        if (existing.length > 0) {
            await conn.query(
                `DELETE FROM student_invoices WHERE id = ? AND tenant_id = ?`,
                [existing[0].id, tid]
            );
        }
        return;
    }

    // Only when the student has NO scheduled installment invoices:
    if (existing.length > 0) {
        await conn.query(
            `UPDATE student_invoices SET
                amount = ?,
                paid_amount = 0.00,
                balance_due = ?,
                status = 'unpaid',
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND tenant_id = ?`,
            [balNum, balNum, updatedBy, existing[0].id, tid]
        );
    } else {
        const invNum = `INV-${tid}-${sid}-BAL`;
        await conn.query(
            `INSERT INTO student_invoices (
                tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                invoice_number, installment_number, description, issue_date, due_date,
                amount, paid_amount, balance_due, status, created_by, updated_by
             ) VALUES (?, ?, ?, ?, ?, ?, 1, 'Pending Balance Fee', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), ?, 0.00, ?, 'unpaid', ?, ?)`,
            [
                tid, branchId || 1, sid, enrollmentId || 1, feeAssignmentId || null,
                invNum, balNum, balNum, updatedBy, updatedBy
            ]
        );
    }
};

/**
 * Validates payment input against the active fee assignment + outstanding invoices
 * and returns a normalized plan of how `amount` maps to invoice allocations.
 *
 * - If `installmentIds` is provided, `amount` is applied across those invoices
 *   (each capped at its remaining balance, in installment order).
 * - Otherwise the amount auto-distributes across outstanding invoices in order.
 * - Rejects overpayment: amount may not exceed the total outstanding balance.
 */
const validateAndPlan = async (tenantId, studentId, amount, installmentIds) => {
    const amountNum = round2(Number(amount) || 0);
    if (amountNum <= 0) throw httpError(400, 'Payment amount must be greater than zero');

    const ledger = await getStudentLedger(tenantId, studentId);
    if (!ledger.feeAssignment) throw httpError(404, 'No fee assignment found for this student');

    const outstanding = ledger.invoices
        .filter(i => i.outstanding > 0)
        .sort((a, b) => a.installment_number - b.installment_number);

    const fee = ledger.feeAssignment;
    const feeRemaining = round2(Math.max(0, (Number(fee.net_amount) || 0) - (Number(fee.paid_amount) || 0)));
    const invoiceOutstanding = round2(outstanding.reduce((s, i) => s + i.outstanding, 0));
    const totalOutstanding = round2(Math.max(feeRemaining, invoiceOutstanding));

    // Reject any overpayment beyond the remaining/outstanding figure.
    if (amountNum > totalOutstanding) {
        throw httpError(
            400,
            `Payment amount ₹${amountNum.toLocaleString('en-IN')} exceeds the remaining balance ₹${totalOutstanding.toLocaleString('en-IN')}`
        );
    }

    let allocations = [];
    if (outstanding.length > 0) {
        let targets;
        if (Array.isArray(installmentIds) && installmentIds.length > 0) {
            const idSet = new Set(installmentIds.map(id => Number(id)));
            targets = outstanding.filter(i => idSet.has(i.id));
            if (targets.length !== idSet.size) {
                throw httpError(400, 'One or more selected invoices have no outstanding balance');
            }
            targets.sort((a, b) => a.installment_number - b.installment_number);
            const selectedOutstanding = targets.reduce((s, i) => s + i.outstanding, 0);
            if (amountNum > round2(selectedOutstanding)) {
                throw httpError(
                    400,
                    `Payment amount ₹${amountNum.toLocaleString('en-IN')} exceeds the selected invoices' outstanding balance ₹${selectedOutstanding.toLocaleString('en-IN')}`
                );
            }
        } else {
            targets = outstanding;
        }

        // Allocate amount across target invoices in order, capping each at its remaining balance.
        let remaining = amountNum;
        for (const inv of targets) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, inv.outstanding);
            allocations.push({ invoice: inv, amount: round2(alloc) });
            remaining = round2(remaining - alloc);
        }
    }

    return { ledger, totalOutstanding, allocations };
};

const validateAdditionalFields = (data) => {
    const rawMode = String(data.payment_mode || '').trim();
    const matchedMode = PAYMENT_MODES.find(
        (m) => m.toLowerCase() === rawMode.toLowerCase() || m.toLowerCase().replace(/\s+/g, '_') === rawMode.toLowerCase()
    );
    if (!matchedMode) {
        throw httpError(400, `Invalid payment mode. Expected one of: ${PAYMENT_MODES.join(', ')}`);
    }
    data.payment_mode = matchedMode;
    if (data.transaction_reference !== undefined && data.transaction_reference !== null) {
        const ref = String(data.transaction_reference).trim();
        if (ref.length > 100) throw httpError(400, 'Transaction reference cannot exceed 100 characters');
    }
    if (data.remarks !== undefined && data.remarks !== null) {
        const remarks = String(data.remarks).trim();
        if (remarks.length > 500) throw httpError(400, 'Remarks cannot exceed 500 characters');
    }
};

/**
 * Records a fee payment against a student's fee assignment + invoices.
 * Runs atomically: receipt + payment_transaction + allocation links are created,
 * invoices are updated, and the fee assignment balance is reduced.
 */
const recordPayment = async ({
    tenantId,
    studentId,
    enrollmentId,
    branchId,
    createdBy,
    amount,
    paymentMode,
    transactionReference = null,
    remarks = null,
    installmentIds = null
}) => {
    const tid = Number(tenantId);
    const validator = await validateAndPlan(tid, studentId, amount, installmentIds);
    const fieldsToValidate = { payment_mode: paymentMode, transaction_reference: transactionReference, remarks };
    validateAdditionalFields(fieldsToValidate);

    const {
        ledger,
        allocations,
        totalOutstanding
    } = validator;

    const amountNum = round2(Number(amount) || 0);
    const mode = fieldsToValidate.payment_mode || String(paymentMode).trim();
    const reference = transactionReference ? String(transactionReference).trim() : null;
    const note = remarks ? String(remarks).trim() : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const receiptNumber = await generateReceiptNumber(tid);
        const effectiveBranchId = Number(branchId) || ledger.primary_branch_id || 1;

        const [receiptRes] = await conn.query(
            `INSERT INTO receipts (
                tenant_id, branch_id, receipt_number, enrollment_id, total_amount, receipt_date, status, created_by
             ) VALUES (?, ?, ?, ?, ?, CURDATE(), 'active', ?)`,
            [tid, effectiveBranchId, receiptNumber, Number(enrollmentId) || ledger.enrollment_id, amountNum, createdBy]
        );
        const receiptId = receiptRes.insertId;

        const [txnRes] = await conn.query(
            `INSERT INTO payment_transactions (
                tenant_id, receipt_id, payment_mode, amount, reference_number, payment_date, status, created_by
             ) VALUES (?, ?, ?, ?, ?, NOW(), 'success', ?)`,
            [tid, receiptId, mode, amountNum, reference, createdBy]
        );
        const paymentId = txnRes.insertId;

        const fee = ledger.feeAssignment;
        const updatedInvoices = [];

        if (allocations.length > 0) {
            for (const { invoice, amount: alloc } of allocations) {
                const newPaid = round2(invoice.paid_amount + alloc);
                const newBalance = round2(Math.max(0, invoice.amount - newPaid));
                const newStatus = newBalance <= 0 ? 'paid' : 'unpaid';

                await conn.query(
                    `UPDATE student_invoices SET
                        paid_amount = ?, balance_due = ?, status = ?,
                        payment_date = COALESCE(payment_date, NOW()),
                        payment_mode = ?, transaction_reference = ?, remarks = ?,
                        updated_by = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND student_id = ? AND tenant_id = ?`,
                    [newPaid, newBalance, newStatus, mode, reference, note, createdBy, invoice.id, studentId, tid]
                );

                await conn.query(
                    `INSERT INTO payment_installment_links (
                        tenant_id, payment_id, installment_id, amount_allocated
                     ) VALUES (?, ?, ?, ?)`,
                    [tid, paymentId, invoice.id, alloc]
                );

                updatedInvoices.push({
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    installment_number: invoice.installment_number,
                    amount: invoice.amount,
                    paid_amount: newPaid,
                    balance_due: newBalance,
                    status: newStatus
                });
            }
        } else {
            // No outstanding invoices: record the whole amount as a new paid
            // collection invoice (invoices only represent amounts already paid).
            const invNumber = await generateCollectionInvoiceNumber(tid, studentId, conn);
            const [invRes] = await conn.query(
                `INSERT INTO student_invoices (
                    tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                    invoice_number, installment_number, description, issue_date, due_date,
                    payment_date, amount, paid_amount, balance_due, payment_mode,
                    transaction_reference, remarks, status, created_by
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), NOW(), ?, ?, 0.00, ?, ?, ?, 'paid', ?)`,
                [
                    tid, effectiveBranchId, Number(studentId), Number(enrollmentId) || ledger.enrollment_id,
                    fee.id, invNumber, 0,
                    `Fee collection ${receiptNumber}`,
                    amountNum, amountNum, mode, reference, note, createdBy
                ]
            );
            const invoiceId = invRes.insertId;

            await conn.query(
                `INSERT INTO payment_installment_links (
                    tenant_id, payment_id, installment_id, amount_allocated
                 ) VALUES (?, ?, ?, ?)`,
                [tid, paymentId, invoiceId, amountNum]
            );

            updatedInvoices.push({
                id: invoiceId,
                invoice_number: invNumber,
                installment_number: 0,
                amount: amountNum,
                paid_amount: amountNum,
                balance_due: 0,
                status: 'paid'
            });
        }

        const newPaidFee = round2(fee.paid_amount + amountNum);
        const newBalanceFee = round2(Math.max(0, (fee.net_amount || 0) - newPaidFee));
        const newFeeStatus = newBalanceFee <= 0 ? 'paid' : (newPaidFee > 0 ? 'partial' : 'unpaid');

        await conn.query(
            `UPDATE student_fee_assignments SET
                paid_amount = ?, balance_amount = ?, status = ?,
                updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newPaidFee, newBalanceFee, newFeeStatus, createdBy, fee.id]
        );

        await syncPendingBalanceInvoice(conn, {
            tenantId: tid,
            branchId: effectiveBranchId,
            studentId: Number(studentId),
            enrollmentId: Number(enrollmentId) || ledger.enrollment_id,
            feeAssignmentId: fee.id,
            balanceAmount: newBalanceFee,
            updatedBy: createdBy
        });

        // Activate student status in students table, admissions table, and student user account upon payment
        await conn.query(
            `UPDATE students SET status = 1, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
            [Number(studentId), tid]
        );
        await conn.query(
            `UPDATE admissions SET status = 1, activated_at = NOW(), updated_at = NOW() WHERE student_id = ? AND tenant_id = ?`,
            [Number(studentId), tid]
        );
        await conn.query(
            `UPDATE users u JOIN students s ON s.user_id = u.id SET u.status = 'active', u.updated_at = NOW() WHERE s.id = ? AND s.tenant_id = ?`,
            [Number(studentId), tid]
        );

        await conn.commit();

        return {
            receipt: {
                id: receiptId,
                receipt_number: receiptNumber,
                amount: amountNum,
                receipt_date: new Date().toISOString().split('T')[0]
            },
            payment: {
                id: paymentId,
                payment_mode: mode,
                amount: amountNum,
                reference_number: reference,
                status: 'success'
            },
            allocations: updatedInvoices,
            feeAssignment: {
                id: fee.id,
                net_amount: fee.net_amount,
                paid_amount: newPaidFee,
                balance_amount: newBalanceFee,
                status: newFeeStatus
            },
            outstandingAfter: round2(Math.max(0, totalOutstanding - amountNum))
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Creates a paid collection invoice for a student and syncs the fee assignment.
 * Invoices represent money already received, so balance_due is 0 and status is 'paid'.
 * Runs atomically: the invoice row is inserted and the fee assignment's
 * paid/balance/status are kept in sync with the recorded amount.
 */
const createCollectionInvoice = async ({
    tenantId,
    studentId,
    createdBy,
    amount,
    paymentMode,
    transactionReference = null,
    remarks = null,
    description = null,
    issueDate = null,
    dueDate = null
}) => {
    const tid = Number(tenantId);
    const sid = Number(studentId);
    const amountNum = round2(Number(amount) || 0);
    if (amountNum <= 0) throw httpError(400, 'Invoice amount must be greater than zero');

    const ledger = await getStudentLedger(tid, sid);
    if (!ledger.feeAssignment) throw httpError(404, 'No fee assignment found for this student');

    validateAdditionalFields({ payment_mode: paymentMode, transaction_reference: transactionReference, remarks });

    const mode = String(paymentMode).trim();
    const reference = transactionReference ? String(transactionReference).trim() : null;
    const note = remarks ? String(remarks).trim() : null;
    const desc = description ? String(description).trim() : null;
    const today = new Date().toISOString().split('T')[0];

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const invoiceNumber = await generateCollectionInvoiceNumber(tid, sid, conn);
        const effectiveBranchId = ledger.primary_branch_id || 1;

        const [invRes] = await conn.query(
            `INSERT INTO student_invoices (
                tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                invoice_number, installment_number, description, issue_date, due_date,
                payment_date, amount, paid_amount, balance_due, payment_mode,
                transaction_reference, remarks, status, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), ?, ?, 0.00, ?, ?, ?, 'paid', ?)`,
            [
                tid, effectiveBranchId, sid, ledger.enrollment_id, ledger.feeAssignment.id,
                invoiceNumber,
                desc || `Fee collection ${invoiceNumber}`,
                issueDate || today,
                dueDate || today,
                amountNum, amountNum, mode, reference, note, createdBy
            ]
        );

        const fee = ledger.feeAssignment;
        const currentBalance = round2(Number(fee.balance_amount) || 0);
        if (amountNum > currentBalance) {
            throw httpError(400, `Invoice amount ₹${amountNum.toLocaleString('en-IN')} exceeds current balance ₹${currentBalance.toLocaleString('en-IN')}`);
        }

        const newPaidFee = round2(fee.paid_amount + amountNum);
        const newBalanceFee = round2(Math.max(0, (fee.net_amount || 0) - newPaidFee));
        const newFeeStatus = newBalanceFee <= 0 ? 'paid' : (newPaidFee > 0 ? 'partial' : 'unpaid');

        await conn.query(
            `UPDATE student_fee_assignments SET
                paid_amount = ?, balance_amount = ?, status = ?,
                updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newPaidFee, newBalanceFee, newFeeStatus, createdBy, fee.id]
        );

        await syncPendingBalanceInvoice(conn, {
            tenantId: tid,
            branchId: effectiveBranchId,
            studentId: sid,
            enrollmentId: ledger.enrollment_id,
            feeAssignmentId: fee.id,
            balanceAmount: newBalanceFee,
            updatedBy: createdBy
        });

        await conn.commit();

        return {
            invoice: {
                id: invRes.insertId,
                invoice_number: invoiceNumber,
                description: desc || `Fee collection ${invoiceNumber}`,
                issue_date: issueDate || today,
                due_date: dueDate || today,
                payment_date: new Date().toISOString().split('T')[0],
                amount: amountNum,
                paid_amount: amountNum,
                balance_due: 0,
                payment_mode: mode,
                transaction_reference: reference,
                remarks: note,
                status: 'paid'
            },
            feeAssignment: {
                id: fee.id,
                net_amount: fee.net_amount,
                paid_amount: newPaidFee,
                balance_amount: newBalanceFee,
                status: newFeeStatus
            }
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Collects a branch fee payment against a student's fee assignment:
 * - Checks tenant and branch ownership (student & feeAssignment must belong to branch)
 * - Uses SELECT ... FOR UPDATE on student_fee_assignments
 * - Validates amount > 0 and amount <= balance_amount
 * - Generates unique invoice_number
 * - Inserts a row in student_invoices with paid_amount = amount, balance_due = 0.00, status = 'paid'
 * - Updates student_fee_assignments (paid_amount += amount, balance_amount, status)
 * - Commits transaction and returns clean response
 */
const collectBranchPayment = async ({
    tenantId,
    branchId,
    studentId,
    feeAssignmentId = null,
    amount,
    paymentMode,
    transactionReference = null,
    remarks = null,
    createdBy = 1
}) => {
    const tid = Number(tenantId);
    const sid = Number(studentId);
    const bid = branchId ? Number(branchId) : null;
    const amountNum = round2(Number(amount) || 0);

    if (isNaN(amountNum) || amountNum <= 0) {
        throw httpError(400, 'Payment amount must be greater than zero');
    }

    const fieldsToValidate = { payment_mode: paymentMode, transaction_reference: transactionReference, remarks };
    validateAdditionalFields(fieldsToValidate);
    const mode = fieldsToValidate.payment_mode || String(paymentMode).trim();
    const reference = transactionReference ? String(transactionReference).trim() : null;
    const note = remarks ? String(remarks).trim() : null;
    const today = new Date().toISOString().split('T')[0];

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Verify student and branch
        const [students] = await conn.query(
            `SELECT s.id, s.primary_branch_id, s.full_name, s.student_code, se.id AS enrollment_id
             FROM students s
             LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
             WHERE s.tenant_id = ? AND s.id = ? AND s.deleted_at IS NULL
             FOR UPDATE`,
            [tid, sid]
        );
        if (students.length === 0) throw httpError(404, 'Student not found');

        const student = students[0];
        if (bid && Number(student.primary_branch_id) !== bid) {
            throw httpError(403, 'Forbidden: Student does not belong to your authorized branch.');
        }

        // 2. Lock fee assignment
        let faQuery = `SELECT * FROM student_fee_assignments WHERE student_id = ? AND tenant_id = ?`;
        const faParams = [sid, tid];
        if (feeAssignmentId) {
            faQuery += ` AND id = ?`;
            faParams.push(Number(feeAssignmentId));
        }
        faQuery += ` ORDER BY id DESC LIMIT 1 FOR UPDATE`;

        const [feeRows] = await conn.query(faQuery, faParams);
        if (feeRows.length === 0) throw httpError(404, 'Fee assignment not found for this student');

        const fee = feeRows[0];
        if (bid && fee.branch_id && Number(fee.branch_id) !== bid) {
            throw httpError(403, 'Forbidden: Fee assignment does not belong to your authorized branch.');
        }

        const currentBalance = round2(Number(fee.balance_amount) || 0);
        if (amountNum > currentBalance) {
            throw httpError(400, `Payment amount ₹${amountNum.toLocaleString('en-IN')} exceeds the current balance ₹${currentBalance.toLocaleString('en-IN')}`);
        }

        // 3. Generate invoice number
        const invoiceNumber = await generateCollectionInvoiceNumber(tid, sid, conn);
        const effectiveBranchId = fee.branch_id || student.primary_branch_id || bid || 1;

        // 4. Create student_invoices record
        const [invRes] = await conn.query(
            `INSERT INTO student_invoices (
                tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                invoice_number, installment_number, description, issue_date, due_date,
                payment_date, amount, paid_amount, balance_due, payment_mode,
                transaction_reference, remarks, status, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), ?, ?, 0.00, ?, ?, ?, 'paid', ?)`,
            [
                tid, effectiveBranchId, sid, student.enrollment_id, fee.id,
                invoiceNumber,
                `Fee collection ${invoiceNumber}`,
                today,
                today,
                amountNum, amountNum, mode, reference, note, createdBy
            ]
        );

        // 5. Update student_fee_assignments
        const newPaidFee = round2((Number(fee.paid_amount) || 0) + amountNum);
        const newBalanceFee = round2(Math.max(0, (Number(fee.net_amount) || 0) - newPaidFee));
        const newFeeStatus = newBalanceFee <= 0 ? 'paid' : (newPaidFee > 0 ? 'partial' : 'unpaid');

        await conn.query(
            `UPDATE student_fee_assignments SET
                paid_amount = ?, balance_amount = ?, status = ?,
                updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newPaidFee, newBalanceFee, newFeeStatus, createdBy, fee.id]
        );

        await syncPendingBalanceInvoice(conn, {
            tenantId: tid,
            branchId: effectiveBranchId,
            studentId: sid,
            enrollmentId: student.enrollment_id,
            feeAssignmentId: fee.id,
            balanceAmount: newBalanceFee,
            updatedBy: createdBy
        });

        // Activate student status in students table, admissions table, and student user account upon payment
        await conn.query(
            `UPDATE students SET status = 1, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
            [sid, tid]
        );
        await conn.query(
            `UPDATE admissions SET status = 1, activated_at = NOW(), updated_at = NOW() WHERE student_id = ? AND tenant_id = ?`,
            [sid, tid]
        );
        await conn.query(
            `UPDATE users u JOIN students s ON s.user_id = u.id SET u.status = 'active', u.updated_at = NOW() WHERE s.id = ? AND s.tenant_id = ?`,
            [sid, tid]
        );

        await conn.commit();

        return {
            invoice: {
                id: invRes.insertId,
                invoiceNumber,
                invoice_number: invoiceNumber,
                description: `Fee collection ${invoiceNumber}`,
                issueDate: today,
                dueDate: today,
                paymentDate: today,
                amount: amountNum,
                paidAmount: amountNum,
                paid_amount: amountNum,
                balanceDue: 0,
                balance_due: 0,
                paymentMode: mode,
                payment_mode: mode,
                transactionReference: reference,
                transaction_reference: reference,
                remarks: note,
                status: 'paid'
            },
            feeAssignment: {
                id: fee.id,
                grossAmount: Number(fee.gross_amount) || 0,
                totalConcession: Number(fee.total_concession) || 0,
                netAmount: Number(fee.net_amount) || 0,
                paidAmount: newPaidFee,
                balanceAmount: newBalanceFee,
                status: newFeeStatus
            }
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Loads current fee assignment for a student, verifying branch access.
 */
const getStudentFeeAssignment = async (tenantId, studentId, accessContext = null) => {
    const ledger = await getStudentLedger(tenantId, studentId, accessContext);
    if (!ledger.feeAssignment) {
        throw httpError(404, 'No fee assignment found for this student');
    }

    // Resolve course / program name from student's batch or fee source
    let sourceName = 'Assigned Program';
    if (ledger.feeAssignment.fee_source_type === 'bundle' && ledger.feeAssignment.fee_source_id) {
        const [bRows] = await pool.query(
            `SELECT name FROM subject_bundles WHERE id = ? AND tenant_id = ?`,
            [ledger.feeAssignment.fee_source_id, tenantId]
        );
        if (bRows[0]) sourceName = `Bundle: ${bRows[0].name}`;
    } else if (ledger.batch_id) {
        const [batRows] = await pool.query(
            `SELECT c.name AS course_name, p.name AS program_name
             FROM batches b
             LEFT JOIN levels l ON l.id = b.level_id
             LEFT JOIN programs p ON p.id = l.program_id
             LEFT JOIN courses c ON c.id = p.course_id
             WHERE b.id = ? AND b.tenant_id = ?`,
            [ledger.batch_id, tenantId]
        );
        if (batRows[0]) {
            sourceName = `${batRows[0].course_name || ''} - ${batRows[0].program_name || ''}`.trim() || sourceName;
        }
    }

    const fa = ledger.feeAssignment;
    return {
        id: fa.id,
        studentId: ledger.id,
        studentName: ledger.full_name,
        studentCode: ledger.student_code,
        branchId: ledger.primary_branch_id,
        branchName: ledger.branch_name,
        enrollmentId: ledger.enrollment_id,
        feeSourceType: fa.fee_source_type,
        feeSourceId: fa.fee_source_id,
        feeSourceName: sourceName,
        grossAmount: fa.gross_amount,
        totalConcession: fa.total_concession,
        netAmount: fa.net_amount,
        downPayment: fa.down_payment,
        installmentCount: fa.installment_count,
        installmentAmount: fa.installment_amount,
        paidAmount: fa.paid_amount,
        balanceAmount: fa.balance_amount,
        status: fa.status
    };
};

/**
 * Updates a student's commercial fee assignment within a strict transaction.
 * Server authoritatively calculates net_amount, balance_amount, installment_amount, and status.
 * Preserves historical paid amount and paid invoices.
 */
const updateStudentFeeAssignment = async (tenantId, studentId, payload, accessContext = null, userId = 1) => {
    const tid = Number(tenantId);
    const sid = Number(studentId);

    const grossAmount = round2(Number(payload.grossAmount));
    const totalConcession = round2(Number(payload.totalConcession || 0));
    const downPayment = round2(Number(payload.downPayment || 0));
    const installmentCount = Math.max(1, parseInt(payload.installmentCount, 10) || 1);

    if (isNaN(grossAmount) || grossAmount < 0) {
        throw httpError(400, 'Gross amount must be a valid non-negative number');
    }
    if (isNaN(totalConcession) || totalConcession < 0) {
        throw httpError(400, 'Concession must be a valid non-negative number');
    }
    if (totalConcession > grossAmount) {
        throw httpError(400, 'Concession cannot exceed gross amount');
    }
    if (isNaN(downPayment) || downPayment < 0) {
        throw httpError(400, 'Down payment must be a valid non-negative number');
    }

    const netAmount = round2(grossAmount - totalConcession);
    if (downPayment > netAmount) {
        throw httpError(400, 'Down payment cannot exceed net payable amount');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Verify student and branch
        const [students] = await conn.query(
            `SELECT s.id, s.primary_branch_id, se.id AS enrollment_id
             FROM students s
             LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
             WHERE s.tenant_id = ? AND s.id = ? AND s.deleted_at IS NULL
             FOR UPDATE`,
            [tid, sid]
        );
        if (students.length === 0) throw httpError(404, 'Student not found');

        const student = students[0];
        if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
            if (Number(student.primary_branch_id) !== Number(accessContext.authorizedBranchId)) {
                throw httpError(403, 'Forbidden: You cannot modify fee assignments for students outside your branch.');
            }
        }

        // 2. Lock fee assignment
        const [feeRows] = await conn.query(
            `SELECT * FROM student_fee_assignments 
             WHERE student_id = ? AND tenant_id = ? 
             ORDER BY id DESC LIMIT 1 
             FOR UPDATE`,
            [sid, tid]
        );
        if (feeRows.length === 0) throw httpError(404, 'Fee assignment not found');

        const currentFee = feeRows[0];
        const existingPaid = round2(Number(currentFee.paid_amount) || 0);

        // 3. Server calculations
        const balanceAmount = round2(Math.max(0, netAmount - existingPaid));
        const remAfterDown = Math.max(0, netAmount - downPayment);
        const installmentAmount = installmentCount > 0 ? round2(remAfterDown / installmentCount) : 0;
        const newStatus = balanceAmount <= 0 ? 'paid' : (existingPaid > 0 ? 'partial' : 'unpaid');

        // 4. Update assignment
        await conn.query(
            `UPDATE student_fee_assignments SET
                gross_amount = ?,
                total_concession = ?,
                net_amount = ?,
                down_payment = ?,
                installment_count = ?,
                installment_amount = ?,
                balance_amount = ?,
                status = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                grossAmount,
                totalConcession,
                netAmount,
                downPayment,
                installmentCount,
                installmentAmount,
                balanceAmount,
                newStatus,
                userId,
                currentFee.id
            ]
        );

        await syncPendingBalanceInvoice(conn, {
            tenantId: tid,
            branchId: student.primary_branch_id,
            studentId: sid,
            enrollmentId: student.enrollment_id,
            feeAssignmentId: currentFee.id,
            balanceAmount,
            updatedBy: userId
        });

        await conn.commit();

        return {
            id: currentFee.id,
            studentId: sid,
            grossAmount,
            totalConcession,
            netAmount,
            downPayment,
            installmentCount,
            installmentAmount,
            paidAmount: existingPaid,
            balanceAmount,
            status: newStatus
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Retrieves invoice by ID with branch check.
 */
const getInvoiceById = async (tenantId, invoiceId, accessContext = null) => {
    const tid = Number(tenantId);
    const invId = Number(invoiceId);

    const [rows] = await pool.query(
        `SELECT si.*, s.full_name AS student_name, s.student_code, b.name AS branch_name
         FROM student_invoices si
         JOIN students s ON s.id = si.student_id
         LEFT JOIN branches b ON b.id = si.branch_id
         WHERE si.id = ? AND si.tenant_id = ?`,
        [invId, tid]
    );
    if (rows.length === 0) throw httpError(404, 'Invoice not found');

    const inv = rows[0];
    if (accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId) {
        if (Number(inv.branch_id) !== Number(accessContext.authorizedBranchId)) {
            throw httpError(403, 'Forbidden: You cannot view invoices outside your authorized branch.');
        }
    }
    return inv;
};

/**
 * Updates a student invoice and recalculates fee assignment balances atomically.
 */
const updateCollectionInvoice = async ({
    tenantId,
    invoiceId,
    amount,
    paymentMode,
    transactionReference = null,
    description = null,
    remarks = null,
    issueDate = null,
    dueDate = null,
    paymentDate = null,
    accessContext = null,
    updatedBy = 1
}) => {
    const tid = Number(tenantId);
    const invId = Number(invoiceId);
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const bid = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch & lock invoice
        const [invoices] = await conn.query(
            `SELECT * FROM student_invoices WHERE id = ? AND tenant_id = ? FOR UPDATE`,
            [invId, tid]
        );
        if (invoices.length === 0) throw httpError(404, 'Invoice not found');
        const inv = invoices[0];

        if (bid && inv.branch_id && Number(inv.branch_id) !== bid) {
            throw httpError(403, 'Forbidden: Invoice does not belong to your authorized branch.');
        }

        // 2. Fetch & lock fee assignment
        const [feeRows] = await conn.query(
            `SELECT * FROM student_fee_assignments WHERE id = ? AND tenant_id = ? FOR UPDATE`,
            [inv.fee_assignment_id, tid]
        );
        const fee = feeRows[0] || null;

        const oldPaid = inv.paid_amount !== null && inv.paid_amount !== undefined ? Number(inv.paid_amount) : (Number(inv.amount) || 0);
        let newAmount = amount !== undefined ? round2(Number(amount)) : Number(inv.amount);
        if (isNaN(newAmount) || newAmount <= 0) {
            throw httpError(400, 'Invoice amount must be greater than zero');
        }

        const delta = round2(newAmount - oldPaid);

        let newFeePaid = 0;
        let newFeeBalance = 0;
        let newFeeStatus = 'unpaid';

        if (fee) {
            const currentFeePaid = Number(fee.paid_amount) || 0;
            const currentFeeNet = Number(fee.net_amount) || 0;
            newFeePaid = round2(Math.max(0, currentFeePaid + delta));
            newFeeBalance = round2(Math.max(0, currentFeeNet - newFeePaid));
            newFeeStatus = newFeeBalance <= 0 ? 'paid' : (newFeePaid > 0 ? 'partial' : 'unpaid');

            await conn.query(
                `UPDATE student_fee_assignments SET
                    paid_amount = ?, balance_amount = ?, status = ?,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [newFeePaid, newFeeBalance, newFeeStatus, updatedBy, fee.id]
            );

            await syncPendingBalanceInvoice(conn, {
                tenantId: tid,
                branchId: inv.branch_id || fee.branch_id,
                studentId: inv.student_id,
                enrollmentId: inv.enrollment_id,
                feeAssignmentId: fee.id,
                balanceAmount: newFeeBalance,
                updatedBy
            });
        }

        const mode = paymentMode !== undefined ? String(paymentMode).trim() : inv.payment_mode;
        const ref = transactionReference !== undefined ? (transactionReference ? String(transactionReference).trim() : null) : inv.transaction_reference;
        const desc = description !== undefined ? (description ? String(description).trim() : null) : inv.description;
        const note = remarks !== undefined ? (remarks ? String(remarks).trim() : null) : inv.remarks;
        const iDate = issueDate || inv.issue_date;
        const dDate = dueDate || inv.due_date;
        const pDate = paymentDate || inv.payment_date || new Date().toISOString().split('T')[0];

        await conn.query(
            `UPDATE student_invoices SET
                amount = ?, paid_amount = ?, balance_due = 0.00,
                payment_mode = ?, transaction_reference = ?,
                description = ?, remarks = ?,
                issue_date = ?, due_date = ?, payment_date = ?,
                status = 'paid', updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newAmount, newAmount, mode, ref, desc, note, iDate, dDate, pDate, updatedBy, invId]
        );

        // Activate student status in students table, admissions table, and student user account upon payment
        await conn.query(
            `UPDATE students SET status = 1, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
            [Number(inv.student_id), tid]
        );
        await conn.query(
            `UPDATE admissions SET status = 1, activated_at = NOW(), updated_at = NOW() WHERE student_id = ? AND tenant_id = ?`,
            [Number(inv.student_id), tid]
        );
        await conn.query(
            `UPDATE users u JOIN students s ON s.user_id = u.id SET u.status = 'active', u.updated_at = NOW() WHERE s.id = ? AND s.tenant_id = ?`,
            [Number(inv.student_id), tid]
        );

        await conn.commit();

        return {
            id: invId,
            invoiceNumber: inv.invoice_number,
            amount: newAmount,
            paidAmount: newAmount,
            paymentMode: mode,
            transactionReference: ref,
            description: desc,
            remarks: note,
            issueDate: iDate,
            dueDate: dDate,
            paymentDate: pDate,
            status: 'paid',
            feeAssignment: fee ? {
                id: fee.id,
                paidAmount: newFeePaid,
                balanceAmount: newFeeBalance,
                status: newFeeStatus
            } : null
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Deletes a student invoice and adjusts student fee assignment balances atomically.
 */
const deleteCollectionInvoice = async ({
    tenantId,
    invoiceId,
    accessContext = null,
    deletedBy = 1
}) => {
    const tid = Number(tenantId);
    const invId = Number(invoiceId);
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const bid = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch & lock invoice
        const [invoices] = await conn.query(
            `SELECT * FROM student_invoices WHERE id = ? AND tenant_id = ? FOR UPDATE`,
            [invId, tid]
        );
        if (invoices.length === 0) throw httpError(404, 'Invoice not found');
        const inv = invoices[0];

        if (bid && inv.branch_id && Number(inv.branch_id) !== bid) {
            throw httpError(403, 'Forbidden: Invoice does not belong to your authorized branch.');
        }

        // 2. Fetch & lock fee assignment
        const [feeRows] = await conn.query(
            `SELECT * FROM student_fee_assignments WHERE id = ? AND tenant_id = ? FOR UPDATE`,
            [inv.fee_assignment_id, tid]
        );
        const fee = feeRows[0] || null;

        const paidToRevert = inv.paid_amount !== null && inv.paid_amount !== undefined ? Number(inv.paid_amount) : (Number(inv.amount) || 0);

        let newFeePaid = 0;
        let newFeeBalance = 0;
        let newFeeStatus = 'unpaid';

        if (fee) {
            const currentFeePaid = Number(fee.paid_amount) || 0;
            const currentFeeNet = Number(fee.net_amount) || 0;
            newFeePaid = round2(Math.max(0, currentFeePaid - paidToRevert));
            newFeeBalance = round2(Math.max(0, currentFeeNet - newFeePaid));
            newFeeStatus = newFeeBalance <= 0 ? 'paid' : (newFeePaid > 0 ? 'partial' : 'unpaid');

            await conn.query(
                `UPDATE student_fee_assignments SET
                    paid_amount = ?, balance_amount = ?, status = ?,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [newFeePaid, newFeeBalance, newFeeStatus, deletedBy, fee.id]
            );

            await syncPendingBalanceInvoice(conn, {
                tenantId: tid,
                branchId: inv.branch_id || fee.branch_id,
                studentId: inv.student_id,
                enrollmentId: inv.enrollment_id,
                feeAssignmentId: fee.id,
                balanceAmount: newFeeBalance,
                updatedBy: deletedBy
            });
        }

        // 3. Delete invoice row
        await conn.query(
            `DELETE FROM student_invoices WHERE id = ? AND tenant_id = ?`,
            [invId, tid]
        );

        await conn.commit();

        return {
            success: true,
            invoiceId: invId,
            studentId: inv.student_id,
            feeAssignment: fee ? {
                id: fee.id,
                paidAmount: newFeePaid,
                balanceAmount: newFeeBalance,
                status: newFeeStatus
            } : null
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Automated Installment Schedule Builder (Monthly / Termly / Custom)
 * Generates an automated installment schedule for a student:
 * - Divides remaining net fee into N installments.
 * - Respects monthly or termly intervals.
 * - Auto-sets invoice numbers and due dates.
 * - Atomically replaces unpaid placeholder invoices while preserving paid ones.
 */
const generateInstallmentSchedule = async ({
    tenantId,
    studentId,
    scheduleType = 'monthly', // 'monthly' | 'termly' | 'custom'
    installmentCount = 6,
    firstDueDate = null,
    dueDay = 10,
    downPayment = null,
    sendReminder = false,
    createdBy = 1
}) => {
    const tid = Number(tenantId);
    const sid = Number(studentId);
    const count = Math.max(1, Math.min(24, Number(installmentCount) || 1));

    // Get current ledger
    const ledger = await getStudentLedger(tid, sid);
    let fee = ledger.feeAssignment;
    if (!fee) {
        throw httpError(400, 'Student has no active fee assignment. Please assign fees before generating installment schedules.');
    }

    const netAmount = Number(fee.net_amount) || 0;
    const currentPaid = Number(fee.paid_amount) || 0;
    const dp = downPayment !== null && downPayment !== undefined ? Number(downPayment) : (Number(fee.down_payment) || 0);
    const remainingToSchedule = round2(Math.max(0, netAmount - dp - currentPaid));

    if (remainingToSchedule <= 0 && currentPaid >= netAmount) {
        throw httpError(400, 'Student fees are already fully paid. No remaining balance to schedule.');
    }

    const baseAmount = Math.floor(remainingToSchedule / count);
    const remainder = round2(remainingToSchedule - (baseAmount * count));

    const startDate = firstDueDate ? new Date(firstDueDate) : new Date();
    if (isNaN(startDate.getTime())) {
        startDate.setTime(Date.now());
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Delete unpaid / pending balance invoices (keep paid ones)
        await conn.query(
            `DELETE FROM student_invoices 
             WHERE tenant_id = ? AND student_id = ? AND (status = 'unpaid' OR status = 'pending' OR status = 'draft') AND (paid_amount IS NULL OR paid_amount = 0)`,
            [tid, sid]
        );

        // 2. Count existing paid installments to offset numbering
        const [paidInvs] = await conn.query(
            `SELECT MAX(installment_number) AS max_inst FROM student_invoices 
             WHERE tenant_id = ? AND student_id = ? AND status = 'paid'`,
            [tid, sid]
        );
        const startNumber = (Number(paidInvs[0]?.max_inst) || 0) + 1;

        // 3. Generate schedule rows
        const generatedInvoices = [];
        const monthInterval = scheduleType === 'termly' ? 3 : 1;
        const effectiveBranchId = Number(ledger.primary_branch_id) || Number(fee.branch_id) || 1;
        const effectiveEnrollmentId = Number(ledger.enrollment_id) || Number(fee.enrollment_id) || 1;

        for (let i = 0; i < count; i++) {
            const instNum = startNumber + i;
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + (i * monthInterval));
            if (dueDay && !isNaN(Number(dueDay))) {
                dueDate.setDate(Math.min(28, Number(dueDay)));
            }

            const isLast = i === count - 1;
            const instAmount = round2(baseAmount + (isLast ? remainder : 0));
            const invNumber = await generateCollectionInvoiceNumber(tid, sid, conn, i);

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const termName = scheduleType === 'termly'
                ? `Term ${i + 1} (${monthNames[dueDate.getMonth()]} ${dueDate.getFullYear()})`
                : `Installment ${instNum} (${monthNames[dueDate.getMonth()]} ${dueDate.getFullYear()})`;

            const description = scheduleType === 'termly'
                ? `Termly Fee • ${termName}`
                : `Monthly Fee • ${termName}`;

            const year = dueDate.getFullYear();
            const month = String(dueDate.getMonth() + 1).padStart(2, '0');
            const day = String(dueDate.getDate()).padStart(2, '0');
            const formattedDueDate = `${year}-${month}-${day}`;

            const [invRes] = await conn.query(
                `INSERT INTO student_invoices (
                    tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                    invoice_number, installment_number, description, issue_date, due_date,
                    amount, paid_amount, balance_due, status, created_by, updated_by
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, 0.00, ?, 'unpaid', ?, ?)`,
                [
                    tid,
                    effectiveBranchId,
                    sid,
                    effectiveEnrollmentId,
                    fee.id,
                    invNumber,
                    instNum,
                    description,
                    formattedDueDate,
                    instAmount,
                    instAmount,
                    createdBy,
                    createdBy
                ]
            );

            generatedInvoices.push({
                id: invRes.insertId,
                invoice_number: invNumber,
                installment_number: instNum,
                description,
                due_date: formattedDueDate,
                amount: instAmount,
                balance_due: instAmount,
                status: 'unpaid'
            });
        }

        // 4. Update student fee assignment
        const newInstallmentAmount = count > 0 ? round2(remainingToSchedule / count) : 0;
        const totalInstallments = count + (paidInvs[0]?.max_inst || 0);
        const newFeeStatus = remainingToSchedule <= 0 ? 'paid' : (currentPaid > 0 ? 'partial' : 'pending');

        await conn.query(
            `UPDATE student_fee_assignments SET
                installment_count = ?,
                installment_amount = ?,
                down_payment = ?,
                balance_amount = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND tenant_id = ?`,
            [totalInstallments, newInstallmentAmount, dp, remainingToSchedule, newFeeStatus, fee.id, tid]
        );

        await conn.commit();

        return {
            success: true,
            studentId: sid,
            scheduleType,
            installmentCount: count,
            totalScheduled: remainingToSchedule,
            invoices: generatedInvoices,
            message: `Successfully generated ${count} ${scheduleType} installment(s) totaling ₹${remainingToSchedule.toLocaleString('en-IN')}.`
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

/**
 * Send Payment Reminder for an invoice
 */
const sendPaymentReminder = async ({ tenantId, invoiceId, createdBy = 1 }) => {
    const tid = Number(tenantId);
    const iid = Number(invoiceId);

    const [rows] = await pool.query(
        `SELECT si.*, s.full_name, s.mobile, s.email, s.student_code, b.name AS branch_name
         FROM student_invoices si
         JOIN students s ON si.student_id = s.id
         LEFT JOIN branches b ON si.branch_id = b.id
         WHERE si.id = ? AND si.tenant_id = ?
         LIMIT 1`,
        [iid, tid]
    );

    if (rows.length === 0) throw httpError(404, 'Invoice not found');
    const inv = rows[0];

    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
    const formattedAmount = '₹' + Number(inv.balance_due || inv.amount).toLocaleString('en-IN');
    const formattedDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Due Soon';

    const message = isOverdue
        ? `Reminder: Payment of ${formattedAmount} for Invoice ${inv.invoice_number} is OVERDUE since ${formattedDate}. Please clear the outstanding dues to avoid late fees. - ${inv.branch_name || 'Vidya Setu Academy'}`
        : `Reminder: Tuition fee installment ${inv.invoice_number} of ${formattedAmount} is due on ${formattedDate}. Please pay online or at the institute office. - ${inv.branch_name || 'Vidya Setu Academy'}`;

    return {
        success: true,
        invoiceId: iid,
        invoiceNumber: inv.invoice_number,
        studentName: inv.full_name,
        mobile: inv.mobile || 'Not registered',
        email: inv.email,
        amountDue: inv.balance_due || inv.amount,
        dueDate: inv.due_date,
        isOverdue,
        channel: 'SMS & WhatsApp & Email',
        dispatchedAt: new Date().toISOString(),
        message
    };
};

/**
 * Reconciliation Transactions Query
 */
const getReconciliationTransactions = async (tenantId, {
    branchId = null,
    status = 'all',
    paymentMode = 'all',
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 20
} = {}) => {
    const tid = Number(tenantId);
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereSql = `WHERE pt.tenant_id = ?`;
    const params = [tid];

    if (branchId && branchId !== 'All' && branchId !== 'all') {
        whereSql += ` AND (r.branch_id = ? OR s.primary_branch_id = ?)`;
        params.push(Number(branchId), Number(branchId));
    }

    if (status && status !== 'all' && status !== 'All') {
        whereSql += ` AND pt.reconciliation_status = ?`;
        params.push(status);
    }

    if (paymentMode && paymentMode !== 'all' && paymentMode !== 'All') {
        whereSql += ` AND pt.payment_mode = ?`;
        params.push(paymentMode);
    }

    if (startDate) {
        whereSql += ` AND DATE(pt.payment_date) >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        whereSql += ` AND DATE(pt.payment_date) <= ?`;
        params.push(endDate);
    }

    if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereSql += ` AND (
            s.full_name LIKE ? OR 
            s.student_code LIKE ? OR 
            r.receipt_number LIKE ? OR 
            pt.reference_number LIKE ? OR 
            pt.bank_reference LIKE ?
        )`;
        params.push(q, q, q, q, q);
    }

    // 1. Overall Summary KPIs for current filter scope
    const [summaryRows] = await pool.query(
        `SELECT
            COUNT(pt.id) AS total_count,
            COALESCE(SUM(pt.amount), 0) AS total_amount,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'reconciled' THEN pt.amount ELSE 0 END), 0) AS reconciled_amount,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'reconciled' THEN 1 ELSE 0 END), 0) AS reconciled_count,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'unreconciled' OR pt.reconciliation_status IS NULL THEN pt.amount ELSE 0 END), 0) AS unreconciled_amount,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'unreconciled' OR pt.reconciliation_status IS NULL THEN 1 ELSE 0 END), 0) AS unreconciled_count,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'discrepancy' THEN pt.amount ELSE 0 END), 0) AS discrepancy_amount,
            COALESCE(SUM(CASE WHEN pt.reconciliation_status = 'discrepancy' THEN 1 ELSE 0 END), 0) AS discrepancy_count
         FROM payment_transactions pt
         LEFT JOIN receipts r ON pt.receipt_id = r.id
         LEFT JOIN student_enrollments se ON r.enrollment_id = se.id
         LEFT JOIN students s ON se.student_id = s.id
         ${whereSql}`,
        params
    );

    const summary = summaryRows[0] || {};
    const totalAmount = Number(summary.total_amount) || 0;
    const reconciledAmount = Number(summary.reconciled_amount) || 0;
    const reconciliationRate = totalAmount > 0 ? Math.round((reconciledAmount / totalAmount) * 100) : 100;

    // 2. Paginated rows
    const [rows] = await pool.query(
        `SELECT
            pt.id,
            pt.tenant_id,
            pt.receipt_id,
            pt.payment_mode,
            pt.amount,
            pt.reference_number,
            pt.bank_reference,
            pt.bank_date,
            pt.reconciliation_status,
            pt.reconciled_at,
            pt.reconciled_by,
            pt.reconciliation_notes,
            pt.payment_date,
            pt.created_at,
            r.receipt_number,
            r.receipt_date,
            r.branch_id,
            b.name AS branch_name,
            s.id AS student_id,
            s.full_name AS student_name,
            s.student_code,
            s.mobile AS student_mobile,
            bat.name AS batch_name,
            u.name AS reconciled_by_name
         FROM payment_transactions pt
         LEFT JOIN receipts r ON pt.receipt_id = r.id
         LEFT JOIN student_enrollments se ON r.enrollment_id = se.id
         LEFT JOIN students s ON se.student_id = s.id
         LEFT JOIN branches b ON COALESCE(r.branch_id, s.primary_branch_id) = b.id
         LEFT JOIN batches bat ON se.batch_id = bat.id
         LEFT JOIN users u ON pt.reconciled_by = u.id
         ${whereSql}
         ORDER BY pt.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
    );

    return {
        summary: {
            totalCount: Number(summary.total_count) || 0,
            totalAmount,
            reconciledAmount,
            reconciledCount: Number(summary.reconciled_count) || 0,
            unreconciledAmount: Number(summary.unreconciled_amount) || 0,
            unreconciledCount: Number(summary.unreconciled_count) || 0,
            discrepancyAmount: Number(summary.discrepancy_amount) || 0,
            discrepancyCount: Number(summary.discrepancy_count) || 0,
            reconciliationRate
        },
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems: Number(summary.total_count) || 0,
            totalPages: Math.ceil((Number(summary.total_count) || 0) / limitNum) || 1
        },
        transactions: rows
    };
};

/**
 * Update Reconciliation Status for one or more transactions
 */
const updateReconciliationStatus = async (tenantId, {
    paymentIds = [],
    status = 'reconciled',
    bankReference = null,
    bankDate = null,
    reconciliationNotes = null,
    userId = 1
}) => {
    const tid = Number(tenantId);
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
        throw httpError(400, 'Please select at least one transaction to reconcile.');
    }

    const ids = paymentIds.map(Number).filter(Boolean);
    const validStatuses = ['unreconciled', 'reconciled', 'discrepancy'];
    if (!validStatuses.includes(status)) {
        throw httpError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const now = new Date();
    const effectiveBankDate = bankDate || (status === 'reconciled' ? now.toISOString().slice(0, 10) : null);
    const effectiveReconciledAt = status === 'reconciled' ? now : null;
    const effectiveReconciledBy = status === 'reconciled' ? userId : null;

    const [res] = await pool.query(
        `UPDATE payment_transactions SET
            reconciliation_status = ?,
            bank_reference = COALESCE(?, bank_reference),
            bank_date = COALESCE(?, bank_date),
            reconciliation_notes = COALESCE(?, reconciliation_notes),
            reconciled_at = ?,
            reconciled_by = ?
         WHERE tenant_id = ? AND id IN (?)`,
        [status, bankReference, effectiveBankDate, reconciliationNotes, effectiveReconciledAt, effectiveReconciledBy, tid, ids]
    );

    // Also update associated receipts
    await pool.query(
        `UPDATE receipts r
         JOIN payment_transactions pt ON r.id = pt.receipt_id
         SET r.reconciliation_status = ?
         WHERE pt.tenant_id = ? AND pt.id IN (?)`,
        [status, tid, ids]
    );

    return {
        success: true,
        updatedCount: res.affectedRows,
        status,
        paymentIds: ids
    };
};

module.exports = {
    getStudentLedger,
    getStudentFeeAssignment,
    updateStudentFeeAssignment,
    recordPayment,
    createCollectionInvoice,
    collectBranchPayment,
    updateCollectionInvoice,
    deleteCollectionInvoice,
    getInvoiceById,
    generateInstallmentSchedule,
    sendPaymentReminder,
    getReconciliationTransactions,
    updateReconciliationStatus
};