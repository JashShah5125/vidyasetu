const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  try {
    const [rows] = await pool.query(
      "SELECT id, student_id, batch_id, bundle_id, subject_selection_type, custom_subject_ids FROM student_enrollments ORDER BY id DESC LIMIT 5"
    );
    console.log("Recent enrollments:", rows);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}
test();
