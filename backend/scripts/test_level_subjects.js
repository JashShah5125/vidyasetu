const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  try {
    const [rows] = await pool.query(`
      SELECT ls.level_id, s.id, s.name, s.code, sf.fee_amount 
      FROM level_subjects ls
      JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
      LEFT JOIN subject_fees sf ON sf.level_id = ls.level_id AND sf.subject_id = ls.subject_id AND sf.deleted_at IS NULL
      WHERE ls.tenant_id = 1
      ORDER BY s.name ASC
    `);
    console.log("levelSubjects rows:", rows.length, rows.slice(0, 5));
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await pool.end();
  }
}
test();
