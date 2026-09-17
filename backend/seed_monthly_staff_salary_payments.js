const pool = require('./src/config/db');

const MONTH_NAMES = [
  '',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function seedMonthlyStaffSalaryPayments() {
  console.log('🚀 Starting full monthly staff salary payments seeding (April 2025 - August 2026)...');

  try {
    const [staffList] = await pool.query(`
      SELECT 
        id, 
        tenant_id, 
        branch_ids, 
        employee_id, 
        first_name, 
        last_name, 
        employee_type, 
        designation, 
        salary_amount, 
        DATE_FORMAT(joining_date, '%Y-%m-%d') as joining_date
      FROM staff_profiles 
      WHERE deleted_at IS NULL 
      ORDER BY id
    `);

    console.log(`Found ${staffList.length} staff members.`);

    // 17 Periods: April 2025 to August 2026
    const periods = [];
    // 2025: April (4) to Dec (12) -> 9 months
    for (let m = 4; m <= 12; m++) {
      periods.push({ month: m, year: 2025 });
    }
    // 2026: Jan (1) to Aug (8) -> 8 months
    for (let m = 1; m <= 8; m++) {
      periods.push({ month: m, year: 2026 });
    }

    console.log(`Targeting ${periods.length} months per staff member (${periods.length * staffList.length} expected records).`);

    const paymentModes = ['bank_transfer', 'bank_transfer', 'bank_transfer', 'bank_transfer', 'upi', 'cheque', 'bank_transfer'];
    let insertedCount = 0;

    for (const staff of staffList) {
      let branchId = 1;
      try {
        const parsed = typeof staff.branch_ids === 'string' ? JSON.parse(staff.branch_ids) : staff.branch_ids;
        if (Array.isArray(parsed) && parsed.length > 0) {
          branchId = Number(parsed[0]) || 1;
        }
      } catch {
        branchId = 1;
      }

      const salaryAmount = Number(staff.salary_amount) || 45000;

      for (let i = 0; i < periods.length; i++) {
        const { month, year } = periods[i];

        // Determine paid date (disbursed between 1st and 5th of next month)
        let payYear = year;
        let payMonth = month + 1;
        if (payMonth > 12) {
          payMonth = 1;
          payYear = year + 1;
        }
        const payDay = 1 + ((staff.id + month) % 4); // 1st, 2nd, 3rd, or 4th
        const paidDate = `${payYear}-${String(payMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;

        const mode = paymentModes[(staff.id + month) % paymentModes.length];
        let refPrefix = 'NEFT';
        if (mode === 'upi') refPrefix = 'UPI';
        else if (mode === 'cheque') refPrefix = 'CHQ';
        else if (mode === 'cash') refPrefix = 'CSH';

        const reference = `${refPrefix}-${year}${String(month).padStart(2, '0')}-${String(staff.id).padStart(4, '0')}`;
        const remarks = `${MONTH_NAMES[month]} ${year} Staff Salary Disbursal`;

        const [result] = await pool.query(`
          INSERT INTO staff_salary_payments (
            tenant_id, branch_id, staff_id, salary_month, salary_year,
            amount, paid_date, payment_mode, reference, remarks,
            created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON DUPLICATE KEY UPDATE
            amount = VALUES(amount),
            paid_date = VALUES(paid_date),
            payment_mode = VALUES(payment_mode),
            reference = VALUES(reference),
            remarks = VALUES(remarks),
            updated_at = NOW()
        `, [
          staff.tenant_id,
          branchId,
          staff.id,
          month,
          year,
          salaryAmount,
          paidDate,
          mode,
          reference,
          remarks,
          `${paidDate} 10:30:00`,
          `${paidDate} 10:30:00`
        ]);

        if (result.affectedRows > 0) {
          insertedCount++;
        }
      }
    }

    console.log(`✅ Finished seeding! Processed ${insertedCount} staff monthly salary records.`);

    // Summary verification
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT staff_id) as distinct_staff,
        MIN(CONCAT(salary_year, '-', LPAD(salary_month, 2, '0'))) as earliest_period,
        MAX(CONCAT(salary_year, '-', LPAD(salary_month, 2, '0'))) as latest_period,
        SUM(amount) as total_disbursed
      FROM staff_salary_payments
      WHERE deleted_at IS NULL
    `);

    console.log('\n=== SEEDING SUMMARY ===');
    console.table(summary);

    const [sample] = await pool.query(`
      SELECT 
        p.id,
        p.staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        CONCAT(p.salary_year, '-', LPAD(p.salary_month, 2, '0')) as period,
        p.amount,
        p.paid_date,
        p.payment_mode,
        p.reference
      FROM staff_salary_payments p
      JOIN staff_profiles sp ON p.staff_id = sp.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.id ASC
      LIMIT 10
    `);

    console.log('\n=== SAMPLE PAYMENT RECORDS ===');
    console.table(sample);

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    process.exit(0);
  }
}

seedMonthlyStaffSalaryPayments();
