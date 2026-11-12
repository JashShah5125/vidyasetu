const pool = require('../backend/src/config/db');

(async () => {
    try {
        const [assignments] = await pool.query('SELECT COUNT(*) as c, SUM(gross_amount) as gross, SUM(net_amount) as net, SUM(paid_amount) as paid, SUM(balance_amount) as balance FROM student_fee_assignments');
        const [invoices] = await pool.query('SELECT COUNT(*) as c, SUM(amount) as total_billed, SUM(paid_amount) as total_paid, SUM(balance_due) as total_due FROM student_invoices');
        const [invoiceStatuses] = await pool.query('SELECT status, COUNT(*) as c FROM student_invoices GROUP BY status');
        const [sampleInvoices] = await pool.query('SELECT invoice_number, description, issue_date, due_date, amount, paid_amount, balance_due, payment_mode, status FROM student_invoices WHERE student_id = 1 ORDER BY installment_number ASC');

        console.log('=== MASTER FEE CONTRACTS (student_fee_assignments) ===');
        console.log(`Count: ${assignments[0].c}`);
        console.log(`Total Gross Fee  : ₹${Number(assignments[0].gross).toLocaleString()}`);
        console.log(`Total Net Fee    : ₹${Number(assignments[0].net).toLocaleString()}`);
        console.log(`Total Paid Dues  : ₹${Number(assignments[0].paid).toLocaleString()}`);
        console.log(`Outstanding Dues : ₹${Number(assignments[0].balance).toLocaleString()}`);

        console.log('\n=== STUDENT INVOICES & INSTALLMENTS (student_invoices) ===');
        console.log(`Total Invoices Issued: ${invoices[0].c}`);
        console.log(`Total Amount Billed  : ₹${Number(invoices[0].total_billed).toLocaleString()}`);
        console.log(`Total Amount Paid    : ₹${Number(invoices[0].total_paid).toLocaleString()}`);
        console.log(`Total Outstanding    : ₹${Number(invoices[0].total_due).toLocaleString()}`);

        console.log('\n=== INVOICE STATUS BREAKDOWN ===');
        console.table(invoiceStatuses);

        console.log('\n=== SAMPLE INSTALLMENT/INVOICE TIMELINE (Student ID 1) ===');
        console.table(sampleInvoices);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
