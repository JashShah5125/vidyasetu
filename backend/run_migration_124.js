const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });

  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'vidyasetu' AND TABLE_NAME = 'student_enrollments' AND COLUMN_NAME IN ('subject_selection_type', 'custom_subject_ids')"
    );
    const existing = cols.map(c => c.COLUMN_NAME);

    if (!existing.includes('subject_selection_type')) {
      await pool.query(`ALTER TABLE student_enrollments ADD COLUMN subject_selection_type ENUM('bundle', 'custom') NOT NULL DEFAULT 'bundle' AFTER bundle_id`);
      console.log("Added column subject_selection_type to student_enrollments");
    } else {
      console.log("Column subject_selection_type already exists");
    }

    if (!existing.includes('custom_subject_ids')) {
      await pool.query(`ALTER TABLE student_enrollments ADD COLUMN custom_subject_ids JSON NULL AFTER subject_selection_type`);
      console.log("Added column custom_subject_ids to student_enrollments");
    } else {
      console.log("Column custom_subject_ids already exists");
    }

    // Check table structure
    const [describe] = await pool.query("DESCRIBE student_enrollments");
    console.log("\nCurrent student_enrollments columns:");
    describe.forEach(row => console.log(` - ${row.Field} (${row.Type})`));

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
