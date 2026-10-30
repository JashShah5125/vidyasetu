const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  
  // Run the EXACT query that getAcademicOptions uses
  const [programs] = await pool.query(
    'SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC',
    [2]
  );
  console.log('Programs from exact query (tenant_id=2), count:', programs.length);
  console.log(JSON.stringify(programs, null, 2));
  
  // Check what tenant_id the "INST OWNER" (Allen Admin) user has
  const [users] = await pool.query('SELECT id, tenant_id, role, email, username FROM users WHERE role IN ("admin", "institute_owner", "inst_owner") LIMIT 10');
  console.log('\nAdmin/owner users:', JSON.stringify(users, null, 2));

  // Check if courseSetup uses different table name
  const [courseSetupProgs] = await pool.query('SELECT id, course_id, name FROM programs LIMIT 5');
  console.log('\nAll programs (first 5):', JSON.stringify(courseSetupProgs, null, 2));
  
  await pool.end();
}
check().catch(console.error);
