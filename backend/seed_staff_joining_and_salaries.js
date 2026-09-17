const pool = require('./src/config/db');

async function seedStaffJoiningAndSalaries() {
  console.log('🚀 Starting staff joining dates and salary amounts seeding...');

  try {
    const [staffList] = await pool.query(`
      SELECT id, tenant_id, employee_id, first_name, last_name, employee_type, designation 
      FROM staff_profiles 
      WHERE deleted_at IS NULL 
      ORDER BY id
    `);

    console.log(`Found ${staffList.length} staff profiles to update.`);

    // Strict April 2025 joining dates across the month of April only
    const aprilDates = [
      '2025-04-01',
      '2025-04-02',
      '2025-04-04',
      '2025-04-07',
      '2025-04-09',
      '2025-04-11',
      '2025-04-14',
      '2025-04-16',
      '2025-04-18',
      '2025-04-21',
      '2025-04-23',
      '2025-04-25',
      '2025-04-28'
    ];

    let updatedCount = 0;

    for (let i = 0; i < staffList.length; i++) {
      const staff = staffList[i];
      // Every single staff gets a date in April 2025
      const joiningDate = aprilDates[i % aprilDates.length];
      
      let salaryAmount = 48000;
      let designation = staff.designation || (staff.employee_type === 'Teaching' ? 'Faculty' : 'Staff');

      // Structured salary assignment
      if (staff.employee_type === 'Teaching') {
        if (staff.id <= 4) {
          salaryAmount = 65000 + (staff.id * 2000); // 67k, 69k, 71k, 73k
        } else if (staff.id <= 15) {
          salaryAmount = 50000 + ((staff.id % 5) * 1500); // 50k - 56k
        } else if (staff.id <= 26) {
          salaryAmount = 45000 + ((staff.id % 4) * 2000); // 45k - 51k
        } else {
          salaryAmount = 42000;
        }
      } else {
        // Non-teaching roles
        if (staff.designation === 'Branch Admin' || staff.id === 261 || staff.id === 262) {
          salaryAmount = 48000;
          designation = 'Branch Admin';
        } else if (staff.designation === 'Senior Counsellor' || staff.id === 263) {
          salaryAmount = 38000;
          designation = 'Senior Counsellor';
        } else if (staff.designation === 'Accounts Executive' || staff.id === 264 || staff.id === 266) {
          salaryAmount = 35000;
          designation = 'Accounts Executive';
        } else if (staff.designation === 'Counsellor' || staff.id === 265) {
          salaryAmount = 32000;
          designation = 'Counsellor';
        } else {
          salaryAmount = 30000;
        }
      }

      await pool.query(`
        UPDATE staff_profiles 
        SET 
          joining_date = ?,
          salary_amount = ?,
          salary_type = 'Monthly',
          salary_effective_from = ?,
          designation = COALESCE(designation, ?),
          updated_at = NOW()
        WHERE id = ?
      `, [
        joiningDate,
        salaryAmount,
        joiningDate,
        designation,
        staff.id
      ]);

      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} staff profiles with joining dates strictly in April 2025.`);

    // Verify all staff have April 2025 joining dates
    const [verified] = await pool.query(`
      SELECT 
        id, 
        employee_id, 
        CONCAT(first_name, ' ', last_name) as name, 
        employee_type, 
        designation, 
        DATE_FORMAT(joining_date, '%Y-%m-%d') as joining_date, 
        salary_amount, 
        DATE_FORMAT(salary_effective_from, '%Y-%m-%d') as salary_effective_from
      FROM staff_profiles 
      WHERE deleted_at IS NULL 
      ORDER BY id
    `);

    console.table(verified);

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    process.exit(0);
  }
}

seedStaffJoiningAndSalaries();
