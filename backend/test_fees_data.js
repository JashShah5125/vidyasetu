const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  try {
    const [bundles] = await pool.query("SELECT id, name, fee_amount, level_id FROM subject_bundles");
    console.log("Bundles with fee_amount:", bundles);

    const [sf] = await pool.query("SELECT * FROM subject_fees");
    console.log("Subject fees rows:", sf);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}
test();
