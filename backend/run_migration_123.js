const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  try {
    // Check if column already exists
    const [cols] = await pool.query("SHOW COLUMNS FROM students LIKE 'account_type'");
    if (cols.length > 0) {
      console.log('account_type column already exists — skipping');
      await pool.end();
      return;
    }

    await pool.query(`
      ALTER TABLE students
      ADD COLUMN account_type TINYINT(1) NOT NULL DEFAULT 0 AFTER status
    `);
    console.log('✅ Added account_type column to students');

    // Back-fill existing rows as admin-created
    const [result] = await pool.query(`UPDATE students SET account_type = 1`);
    console.log(`✅ Back-filled ${result.affectedRows} existing student rows with account_type = 1`);

    await pool.query(`CREATE INDEX idx_students_account_type ON students(tenant_id, account_type)`);
    console.log('✅ Created index on account_type');

    const [updatedCols] = await pool.query('SHOW COLUMNS FROM students');
    console.log('students columns now:', updatedCols.map(c => c.Field).join(', '));
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
