require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./src/config/db');

async function seed() {
  try {
    console.log('Seeding Other Income for Tenant 2 (Branches 1 & 2)...');
    
    // Clear existing test records for tenant 2
    await pool.query('DELETE FROM branch_other_income WHERE tenant_id = 2');
    console.log('Cleared existing records for Tenant 2.');

    const seedEntries = [
      // ══════════════════════════════════════════════════════════════
      // BRANCH 1: Mumbai West (branch_id: 1)
      // ══════════════════════════════════════════════════════════════
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Classroom & Computer Lab Rental',
        description: 'Weekend rental of Lab 3 and Classrooms 201-204 for National Olympiad Testing Agency exam conduction',
        amount: 45000.00,
        income_date: '2026-09-15', // Today
        payment_mode: 'bank_transfer',
        reference_number: 'HDFC/NEFT/091582910',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/olympiad_lab_rental_sep2026.pdf',
          '/uploads/income/receipts/hdfc_advise_091582910.pdf'
        ]),
        created_by: 101, // Seema Deshpande
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Study Material Kits & Practice Books Sale',
        description: 'Direct counter sales of Advanced JEE/NEET Revision booklets & question banks for external students batch',
        amount: 18500.00,
        income_date: '2026-09-15', // Today
        payment_mode: 'upi',
        reference_number: 'UPI/628192049102',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/book_counter_batch_sales_0915.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Cafeteria & Food Court Franchise Royalty',
        description: 'Monthly fixed revenue share and kiosk utility fee for Mumbai West campus canteen operations',
        amount: 35000.00,
        income_date: '2026-09-10', // This month
        payment_mode: 'bank_transfer',
        reference_number: 'ICICI/IMPS/77291048',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/canteen_royalty_sep2026.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Robotics & AI Weekend Bootcamp Registration',
        description: 'Short-term certified weekend workshop registration fees for 25 high school participant students',
        amount: 37500.00,
        income_date: '2026-09-05', // This month
        payment_mode: 'upi',
        reference_number: 'UPI/882019482019',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/robotics_bootcamp_participants.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Auditorium Hall Rental for Inter-School Debate',
        description: 'Full day rental of main 300-seat auditorium with audio-visual system for Rotary Youth Debate',
        amount: 60000.00,
        income_date: '2026-08-22', // August 2026
        payment_mode: 'cheque',
        reference_number: 'CHQ-892014',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/auditorium_booking_rotary.pdf',
          '/uploads/income/receipts/cheque_deposit_slip_892014.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Scrap & Decommissioned IT Hardware Disposal',
        description: 'Sale of old CRT monitors, obsolete electronics, and shredded answer sheet paper waste to certified recycler',
        amount: 14200.00,
        income_date: '2026-08-11', // August 2026
        payment_mode: 'cash',
        reference_number: 'CASH-REC-2026-084',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/scrap_sale_weighbridge_receipt.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Corporate Career Day Stall Sponsorship',
        description: 'Tier-1 exhibition booth setup charges from EdTech partners during Annual Education & Career Expo',
        amount: 50000.00,
        income_date: '2026-07-18', // July 2026
        payment_mode: 'bank_transfer',
        reference_number: 'AXIS/RTGS/992018471',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/expo_stall_sponsor_agreement.pdf'
        ]),
        created_by: 101,
      },
      {
        tenant_id: 2,
        branch_id: 1,
        title: 'Duplicate Certificate & Transcript Verification',
        description: 'Accumulated processing charges for alumni marksheet verification and overseas university credentials',
        amount: 6500.00,
        income_date: '2026-06-25', // June 2026
        payment_mode: 'card',
        reference_number: 'POS-TXN-492810',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/pos_settlement_batch_jun25.pdf'
        ]),
        created_by: 101,
      },

      // ══════════════════════════════════════════════════════════════
      // BRANCH 2: Pune Camp (branch_id: 2)
      // ══════════════════════════════════════════════════════════════
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Sports Ground & Badminton Court Booking',
        description: 'Evening community sports league turf and indoor badminton court monthly rental subscription',
        amount: 28000.00,
        income_date: '2026-09-15', // Today
        payment_mode: 'upi',
        reference_number: 'UPI/991827364510',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/badminton_club_membership_sep26.pdf'
        ]),
        created_by: 102, // Ramesh Shinde
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Online Mock Test Series Package Sales',
        description: 'Digital portal access pass sales for external non-enrolled students taking Pune Camp MHT-CET mock series',
        amount: 22500.00,
        income_date: '2026-09-12', // This month
        payment_mode: 'bank_transfer',
        reference_number: 'SBI/NEFT/401928471',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/test_series_batch_settlement_sep12.pdf'
        ]),
        created_by: 102,
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Weekend Classroom Rental for Corporate Training',
        description: 'Rental of 2 air-conditioned smart classrooms for IT corporate soft-skills training program',
        amount: 32000.00,
        income_date: '2026-09-08', // This month
        payment_mode: 'bank_transfer',
        reference_number: 'KOTAK/NEFT/662019481',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/corporate_training_room_lease.pdf'
        ]),
        created_by: 102,
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Special Excursion Bus Transportation Charge',
        description: 'Ad-hoc bus fleet charter service charges for Inter-District Science Fair student transit',
        amount: 21000.00,
        income_date: '2026-08-30', // August 2026
        payment_mode: 'cheque',
        reference_number: 'CHQ-552910',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/bus_charter_service_memo.pdf'
        ]),
        created_by: 102,
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Library Overdue Fines & Lost Book Replacement Fees',
        description: 'Quarterly accumulated library fine collections and lost reference guide reimbursement charges',
        amount: 4800.00,
        income_date: '2026-08-15', // August 2026
        payment_mode: 'cash',
        reference_number: 'CASH-REC-2026-091',
        attachment_urls: JSON.stringify([
          '/uploads/income/receipts/library_fine_collection_log.pdf'
        ]),
        created_by: 102,
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Vending Machine & Stationary Stall License Fee',
        description: 'Quarterly franchise license fee for Pune Camp ground floor stationery kiosk and automated dispenser',
        amount: 15000.00,
        income_date: '2026-07-10', // July 2026
        payment_mode: 'bank_transfer',
        reference_number: 'HDFC/IMPS/33910294',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/kiosk_franchise_q2_2026.pdf'
        ]),
        created_by: 102,
      },
      {
        tenant_id: 2,
        branch_id: 2,
        title: 'Alumni Association Annual Dinner Hall Rental',
        description: 'Campus quadrangle and banquet hall booking for Alumni Reunion and Awards Ceremony',
        amount: 40000.00,
        income_date: '2026-05-20', // May 2026
        payment_mode: 'upi',
        reference_number: 'UPI/110293847561',
        attachment_urls: JSON.stringify([
          '/uploads/income/agreements/alumni_hall_booking_2026.pdf'
        ]),
        created_by: 102,
      }
    ];

    let count = 1;
    for (const item of seedEntries) {
      const year = new Date(item.income_date).getFullYear();
      const recordNumber = `OIN-${year}-${String(count).padStart(5, '0')}`;
      
      await pool.query(
        `INSERT INTO branch_other_income 
         (tenant_id, branch_id, income_record_number, title, description, amount, income_date, payment_mode, reference_number, attachment_urls, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          item.tenant_id,
          item.branch_id,
          recordNumber,
          item.title,
          item.description,
          item.amount,
          item.income_date,
          item.payment_mode,
          item.reference_number,
          item.attachment_urls,
          item.created_by
        ]
      );
      console.log(`✅ Inserted [${recordNumber}] Branch ${item.branch_id}: ${item.title} - ₹${item.amount} (${item.income_date})`);
      count++;
    }

    console.log(`\n🎉 Successfully seeded ${seedEntries.length} rich other income records across Branch 1 (Mumbai West) and Branch 2 (Pune Camp)!`);

    // Verify Summary
    const [summary] = await pool.query(`
      SELECT 
        b.name as branch_name,
        COUNT(*) as total_records,
        SUM(boi.amount) as total_amount,
        SUM(CASE WHEN boi.income_date = '2026-09-15' THEN boi.amount ELSE 0 END) as today_amount,
        SUM(CASE WHEN boi.income_date BETWEEN '2026-09-01' AND '2026-09-30' THEN boi.amount ELSE 0 END) as this_month_amount
      FROM branch_other_income boi
      JOIN branches b ON boi.branch_id = b.id
      WHERE boi.tenant_id = 2 AND boi.deleted_at IS NULL
      GROUP BY boi.branch_id, b.name
    `);
    console.log('\n--- Seeded Branch Summaries ---');
    console.table(summary);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
