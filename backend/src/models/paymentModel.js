const pool = require('../config/db');

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const INVOICE_STATUSES = ['unpaid', 'paid'];
const FEE_STATUSES = ['unpaid', 'partial', 'paid'];
const PAYMENT_MODES = ['UPI', 'Cash', 'Cheque', 'Bank Transfer'];

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
         JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
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

    const [feeRows] = await pool.query(
        `SELECT * FROM student_fee_assignments
         WHERE student_id = ? AND tenant_id = ?
         ORDER BY id DESC LIMIT 1`,
        [studentId, tenantId]
    );

    const [invoiceRows] = await pool.query(
        `SELECT * FROM student_invoices
         WHERE student_id = ? AND tenant_id = ?
         ORDER BY installment_number ASC`,
        [studentId, tenantId]
    );

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

    return {
        ...student,
        feeAssignment,
        invoices,
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
const generateCollectionInvoiceNumber = async (tenantId, studentId) => {
    const [rows] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM student_invoices WHERE tenant_id = ? AND student_id = ?',
        [tenantId, studentId]
    );
    const prefix = `INV-${tenantId}-${studentId}-`;
    let seq = (Number(rows[0].cnt) || 0) + 1;
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
        const [exists] = await pool.query('SELECT id FROM student_invoices WHERE invoice_number = ?', [candidate]);
        if (exists.length === 0) return candidate;
        seq += 1;
    }
    return `${prefix}${Date.now()}`;
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
    const mode = String(data.payment_mode || '').trim();
    if (!PAYMENT_MODES.includes(mode)) {
        throw httpError(400, `Invalid payment mode. Expected one of: ${PAYMENT_MODES.join(', ')}`);
    }
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
    validateAdditionalFields({ payment_mode: paymentMode, transaction_reference: transactionReference, remarks });

    const {
        ledger,
        allocations,
        totalOutstanding
    } = validator;

    const amountNum = round2(Number(amount) || 0);
    const mode = String(paymentMode).trim();
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
            const invNumber = await generateCollectionInvoiceNumber(tid, studentId);
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

        const invoiceNumber = await generateCollectionInvoiceNumber(tid, sid);
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
             JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
             WHERE s.tenant_id = ? AND s.id = ? AND s.deleted_at IS NULL
             FOR UPDATE`,
            [tid, sid]
        );
        if (students.length === 0) throw httpError(404, 'Student enrollment not found');

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

module.exports = {
    getStudentLedger,
    getStudentFeeAssignment,
    updateStudentFeeAssignment,
    recordPayment,
    createCollectionInvoice,
    getInvoiceById
};