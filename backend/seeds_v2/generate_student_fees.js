const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../backend/src/config/db');

const seedStudentFees = async () => {
    try {
        console.log('Fetching active student enrollments...');

        const [enrollments] = await pool.query(`
            SELECT 
                se.id AS enrollment_id,
                se.tenant_id,
                se.branch_id,
                se.student_id,
                se.batch_id,
                se.enrolled_date,
                s.full_name,
                bat.name AS batch_name,
                bat.level_id
            FROM student_enrollments se
            JOIN students s ON se.student_id = s.id
            JOIN batches bat ON se.batch_id = bat.id
            WHERE se.status = 'active' AND se.deleted_at IS NULL
        `);

        console.log(`Found ${enrollments.length} active enrollments to process.`);

        let totalAssignments = 0;
        let totalInvoices = 0;

        for (const e of enrollments) {
            // Determine pricing based on level / batch
            const isFoundation = e.batch_name.toLowerCase().includes('8th') || e.batch_name.toLowerCase().includes('foundation');
            const grossAmount = isFoundation ? 80000.00 : 120000.00;

            // Random concession between 0, 5000, 10000, 20000
            const concessionOptions = [0, 5000, 10000, 15000, 20000];
            const concession = concessionOptions[Math.floor(Math.random() * concessionOptions.length)];
            const netAmount = grossAmount - concession;

            const downpayment = isFoundation ? 15000.00 : 25000.00;
            const installmentCount = 6;
            const installmentAmount = Math.round((netAmount - downpayment) / installmentCount);

            // Insert master fee assignment row
            const [assignmentRes] = await pool.query(`
                INSERT INTO student_fee_assignments (
                    tenant_id, branch_id, student_id, enrollment_id, fee_source_type, fee_source_id,
                    gross_amount, total_concession, net_amount, down_payment, installment_count, installment_amount,
                    paid_amount, balance_amount, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, 'program', ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'unpaid', 1, 1)
                ON DUPLICATE KEY UPDATE
                    gross_amount = VALUES(gross_amount),
                    total_concession = VALUES(total_concession),
                    net_amount = VALUES(net_amount),
                    down_payment = VALUES(down_payment),
                    installment_count = VALUES(installment_count),
                    installment_amount = VALUES(installment_amount)
            `, [
                e.tenant_id, e.branch_id, e.student_id, e.enrollment_id, e.level_id || null,
                grossAmount, concession, netAmount, downpayment, installmentCount, installmentAmount, netAmount
            ]);

            const [assignRows] = await pool.query(
                `SELECT id FROM student_fee_assignments WHERE student_id = ? AND enrollment_id = ?`,
                [e.student_id, e.enrollment_id]
            );
            const feeAssignmentId = assignRows[0].id;

            totalAssignments++;

            // Create Invoices & Payment Schedule
            let accumulatedPaid = 0;
            const startDate = e.enrolled_date ? new Date(e.enrolled_date) : new Date('2026-06-01');

            // Determine how many installments student has cleared (randomized 1 to 4)
            const clearedInstallmentsCount = Math.floor(Math.random() * 4) + 1;

            // 1. Downpayment Invoice (Installment 0)
            const dpInvoiceNum = `INV-${e.tenant_id}-${e.student_id}-DP`;
            const dpDateStr = startDate.toISOString().split('T')[0];

            await pool.query(`
                INSERT INTO student_invoices (
                    tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                    invoice_number, installment_number, description, issue_date, due_date, payment_date,
                    amount, paid_amount, balance_due, payment_mode, transaction_reference, remarks, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 'Admission Downpayment', ?, ?, ?, ?, ?, 0.00, 'UPI', ?, 'Downpayment cleared at admission', 'paid', 1, 1)
                ON DUPLICATE KEY UPDATE
                    amount = VALUES(amount), paid_amount = VALUES(paid_amount), balance_due = VALUES(balance_due), status = VALUES(status)
            `, [
                e.tenant_id, e.branch_id, e.student_id, e.enrollment_id, feeAssignmentId,
                dpInvoiceNum, dpDateStr, dpDateStr, dpDateStr,
                downpayment, downpayment, `UPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`
            ]);

            accumulatedPaid += downpayment;
            totalInvoices++;

            // 2. Monthly Installment Invoices (1..6)
            const paymentModes = ['UPI', 'Online Gateway', 'NetBanking', 'Cheque', 'Cash'];

            for (let instNum = 1; instNum <= installmentCount; instNum++) {
                const instInvoiceNum = `INV-${e.tenant_id}-${e.student_id}-INST${instNum}`;
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + instNum);
                const dueDateStr = dueDate.toISOString().split('T')[0];

                const isCleared = instNum <= clearedInstallmentsCount;
                const isOverdue = !isCleared && dueDate < new Date();

                const statusVal = isCleared ? 'paid' : (isOverdue ? 'overdue' : 'unpaid');
                const paidAmt = isCleared ? installmentAmount : 0.00;
                const balanceDue = installmentAmount - paidAmt;
                const payMode = isCleared ? paymentModes[Math.floor(Math.random() * paymentModes.length)] : null;
                const payDate = isCleared ? dueDateStr : null;
                const refNum = isCleared ? `TXN-${Math.floor(10000000 + Math.random() * 90000000)}` : null;
                const remarkText = isCleared ? 'Installment cleared' : (isOverdue ? 'Overdue pending alert' : 'Upcoming installment');

                await pool.query(`
                    INSERT INTO student_invoices (
                        tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id,
                        invoice_number, installment_number, description, issue_date, due_date, payment_date,
                        amount, paid_amount, balance_due, payment_mode, transaction_reference, remarks, status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
                    ON DUPLICATE KEY UPDATE
                        amount = VALUES(amount), paid_amount = VALUES(paid_amount), balance_due = VALUES(balance_due), status = VALUES(status)
                `, [
                    e.tenant_id, e.branch_id, e.student_id, e.enrollment_id, feeAssignmentId,
                    instInvoiceNum, instNum, `Monthly Installment ${instNum} of ${installmentCount}`,
                    dpDateStr, dueDateStr, payDate,
                    installmentAmount, paidAmt, balanceDue, payMode, refNum, remarkText, statusVal
                ]);

                if (isCleared) {
                    accumulatedPaid += installmentAmount;
                }
                totalInvoices++;
            }

            // Update master fee assignment totals
            const balanceAmount = netAmount - accumulatedPaid;
            const finalStatus = balanceAmount <= 0 ? 'paid' : (accumulatedPaid > 0 ? 'partial' : 'unpaid');

            await pool.query(`
                UPDATE student_fee_assignments SET
                    paid_amount = ?,
                    balance_amount = ?,
                    status = ?
                WHERE id = ?
            `, [accumulatedPaid, balanceAmount, finalStatus, feeAssignmentId]);
        }

        console.log(`\n🎉 Successfully generated ${totalAssignments} master fee agreements and ${totalInvoices} student invoices across all enrolled students!`);
        process.exit(0);

    } catch (error) {
        console.error('Error during fee seeding:', error);
        process.exit(1);
    }
};

seedStudentFees();
