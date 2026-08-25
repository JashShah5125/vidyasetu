const db = require('./src/config/db');
async function run() {
  try {
    const [rows] = await db.query('DESCRIBE plan_billing');
    console.log(rows);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
run();
