const fs = require('fs');
const pool = require('./src/config/db');

async function executeSQL() {
  console.log('Reading SQL queries from docs/default_timetable_queries.sql...');
  const sqlFileContent = fs.readFileSync('c:/Users/vnt/Desktop/vidyasetu_full/vidyasetu/docs/default_timetable_queries.sql', 'utf8');

  // Split into individual SQL statements by semicolon
  // Remove full-line comments and empty lines
  const cleanStatements = [];
  const rawStatements = sqlFileContent.split(';');

  for (let raw of rawStatements) {
    // Strip comment lines
    const lines = raw.split('\n').filter(line => !line.trim().startsWith('--'));
    const statement = lines.join('\n').trim();
    if (statement.length > 0) {
      cleanStatements.push(statement);
    }
  }

  console.log(`Found ${cleanStatements.length} SQL statements to execute.`);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let executedCount = 0;
    for (const stmt of cleanStatements) {
      await connection.query(stmt);
      executedCount++;
    }

    await connection.commit();
    console.log(`✅ Successfully executed all ${executedCount} SQL statements in a single transaction!`);

    // Verification check
    const [rows] = await connection.query(`
      SELECT 
        b.id as batch_id, b.name as batch_name, b.code as batch_code,
        COUNT(l.id) as default_slot_count,
        COUNT(DISTINCT l.day_of_week) as days_covered,
        COUNT(DISTINCT l.teacher_user_id) as distinct_teachers,
        MIN(l.classroom_id) as used_room_id,
        b.classroom_id as default_room_id
      FROM batches b
      LEFT JOIN lectures l ON b.id = l.batch_id AND l.is_default = 1 AND l.tenant_id = 2
      WHERE b.tenant_id = 2 AND b.deleted_at IS NULL
      GROUP BY b.id, b.name, b.code, b.classroom_id
      ORDER BY b.branch_id, b.id
    `);

    console.log('\n--- TIMETABLE SEEDING VERIFICATION ---');
    console.table(rows);

    const [totalDefault] = await connection.query(`
      SELECT COUNT(*) as total_default_slots,
             SUM(CASE WHEN day_of_week = 0 THEN 1 ELSE 0 END) as sunday_slots
      FROM lectures
      WHERE tenant_id = 2 AND is_default = 1
    `);
    console.log('Total Default Slots in DB:', totalDefault[0].total_default_slots);
    console.log('Sunday Slots in DB:', totalDefault[0].sunday_slots);

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error executing SQL statements, transaction rolled back:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

executeSQL().catch(err => {
  console.error(err);
  process.exit(1);
});
