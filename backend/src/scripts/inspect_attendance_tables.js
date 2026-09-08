const pool = require('../config/db');

async function inspectAttendance() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE '%attendance%'");
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [desc] = await pool.query(`DESCRIBE ${tableName}`);
      console.log(`\n=== Table: ${tableName} ===`);
      console.table(desc.map(d => ({ Field: d.Field, Type: d.Type, Null: d.Null, Key: d.Key, Default: d.Default })));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectAttendance();
