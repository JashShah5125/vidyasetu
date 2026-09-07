const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  try {
    const [allLS] = await pool.query("SELECT * FROM level_subjects LIMIT 5");
    console.log("allLS:", allLS);
    const [allSubs] = await pool.query("SELECT * FROM subjects LIMIT 5");
    console.log("allSubs:", allSubs);
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await pool.end();
  }
}
test();
