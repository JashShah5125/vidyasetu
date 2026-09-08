const pool = require('../config/db');

async function inspect() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE '%attendance%'");
    console.log('Attendance tables found:', tables);
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [desc] = await pool.query(`DESCRIBE ${tableName}`);
      console.log(`\n=== Table: ${tableName} ===`);
      console.table(desc.map(d => ({ Field: d.Field, Type: d.Type, Null: d.Null, Key: d.Key, Default: d.Default })));
    }

    const [lecDesc] = await pool.query("DESCRIBE lectures");
    console.log('\n=== Table: lectures ===');
    console.table(lecDesc.map(d => ({ Field: d.Field, Type: d.Type, Null: d.Null, Key: d.Key, Default: d.Default })));

    const [stuDesc] = await pool.query("DESCRIBE students");
    console.log('\n=== Table: students ===');
    console.table(stuDesc.map(d => ({ Field: d.Field, Type: d.Type, Null: d.Null, Key: d.Key, Default: d.Default })));

    const [enrDesc] = await pool.query("DESCRIBE student_enrollments");
    console.log('\n=== Table: student_enrollments ===');
    console.table(enrDesc.map(d => ({ Field: d.Field, Type: d.Type, Null: d.Null, Key: d.Key, Default: d.Default })));

  } catch (err) {
    console.error('Error inspecting:', err);
  } finally {
    process.exit(0);
  }
}

inspect();
