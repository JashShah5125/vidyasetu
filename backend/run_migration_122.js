const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });

  try {
    // Check if column already exists
    const [cols] = await pool.query("SHOW COLUMNS FROM student_enrollments LIKE 'bundle_id'");
    if (cols.length > 0) {
      console.log('bundle_id column already exists — skipping migration');
      await pool.end();
      return;
    }

    await pool.query(`
      ALTER TABLE student_enrollments 
      ADD COLUMN bundle_id INT NULL AFTER batch_id,
      ADD CONSTRAINT fk_se_bundle_id FOREIGN KEY (bundle_id) REFERENCES subject_bundles(id) ON DELETE SET NULL
    `);
    console.log('✅ Added bundle_id column to student_enrollments');

    await pool.query(`CREATE INDEX idx_enrollments_bundle ON student_enrollments(bundle_id)`);
    console.log('✅ Created index on bundle_id');

    // Verify
    const [updatedCols] = await pool.query('SHOW COLUMNS FROM student_enrollments');
    console.log('Current columns:', updatedCols.map(c => c.Field).join(', '));

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
