const timetableModel = require('./src/models/timetableModel');
const pool = require('./src/config/db');

async function applyMonthlyDefaultTimetables() {
  const tenantId = 2; // Allen Career Institute

  // 1. Fetch all active batches
  const [batches] = await pool.query(`
    SELECT b.id, b.name, b.code, b.branch_id, br.name as branch_name
    FROM batches b
    JOIN branches br ON b.branch_id = br.id
    WHERE b.tenant_id = ? AND b.deleted_at IS NULL
    ORDER BY b.branch_id, b.id
  `, [tenantId]);

  console.log(`Found ${batches.length} batches for Allen Career Institute.`);

  // 2. Define Mondays for all weeks covering September 2026
  const weekStartDates = [
    '2026-08-31', // Week 1 (covers Sep 1 - Sep 5)
    '2026-09-07', // Week 2 (covers Sep 7 - Sep 12)
    '2026-09-14', // Week 3 (covers Sep 14 - Sep 19)
    '2026-09-21', // Week 4 (covers Sep 21 - Sep 26)
    '2026-09-28'  // Week 5 (covers Sep 28 - Oct 3)
  ];

  console.log('Target Weeks (Mondays):', weekStartDates);

  let totalLecturesGenerated = 0;
  const batchSummary = [];

  for (const batch of batches) {
    let batchLectures = 0;

    for (const weekStartDate of weekStartDates) {
      try {
        const result = await timetableModel.applyDefaultTimetableToWeek(tenantId, {
          batchId: batch.id,
          branchId: batch.branch_id,
          weekStartDate: weekStartDate,
          overwriteExisting: true,
          skipHolidays: true,
          userId: 1
        });

        batchLectures += result.generatedCount;
      } catch (err) {
        console.error(`Error applying week ${weekStartDate} for batch ${batch.id} (${batch.name}):`, err.message);
      }
    }

    totalLecturesGenerated += batchLectures;
    batchSummary.push({
      batch_id: batch.id,
      batch_name: batch.name,
      batch_code: batch.code,
      branch: batch.branch_name,
      weeks_applied: weekStartDates.length,
      calendar_lectures: batchLectures
    });
  }

  console.log('\n======================================================');
  console.log('📊 MONTHLY TIMETABLE GENERATION SUMMARY (SEPTEMBER 2026)');
  console.log('======================================================');
  console.table(batchSummary);
  console.log(`\n🎉 Total Concrete Calendar Lectures Generated: ${totalLecturesGenerated}`);

  // Verification from database
  const [septemberLectures] = await pool.query(`
    SELECT 
      COUNT(*) as total_september_lectures,
      COUNT(DISTINCT batch_id) as batches_scheduled,
      MIN(lecture_date) as earliest_date,
      MAX(lecture_date) as latest_date,
      SUM(CASE WHEN DAYOFWEEK(lecture_date) = 1 THEN 1 ELSE 0 END) as sunday_lectures
    FROM lectures
    WHERE tenant_id = 2 AND is_default = 0 AND lecture_date BETWEEN '2026-09-01' AND '2026-09-30'
  `);

  console.log('\n--- SEPTEMBER 2026 DB STATS ---');
  console.log('Total September Lectures:', septemberLectures[0].total_september_lectures);
  console.log('Batches Scheduled:', septemberLectures[0].batches_scheduled);
  console.log('Date Range:', septemberLectures[0].earliest_date, 'to', septemberLectures[0].latest_date);
  console.log('Sunday Lectures:', septemberLectures[0].sunday_lectures);

  process.exit(0);
}

applyMonthlyDefaultTimetables().catch(err => {
  console.error('Fatal error applying monthly default timetable:', err);
  process.exit(1);
});
