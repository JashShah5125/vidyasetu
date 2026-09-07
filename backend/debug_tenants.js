const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Vnt@2018', database: 'vidyasetu' });
  
  // Check the users table schema
  const [cols] = await pool.query('SHOW COLUMNS FROM users');
  console.log('Users columns:', cols.map(c => c.Field).join(', '));
  
  // Check all users
  const [users] = await pool.query('SELECT * FROM users LIMIT 10');
  console.log('\nAll users (first 10):');
  users.forEach(u => {
    // Print only key fields
    const { id, tenant_id, email, username, created_at, ...rest } = u;
    console.log({ id, tenant_id, email, username });
  });

  // Check tenants
  const [tenants] = await pool.query('SELECT * FROM tenants LIMIT 5');
  console.log('\nTenants:', JSON.stringify(tenants.map(t => ({id: t.id, name: t.name || t.institute_name, slug: t.slug})), null, 2));
  
  // Run programs query for tenant_id = 1 (admin tenant)
  const [progs1] = await pool.query(
    'SELECT id, course_id, name FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC',
    [1]
  );
  console.log('\nPrograms for tenant_id=1:', progs1.length, JSON.stringify(progs1));
  
  await pool.end();
}
check().catch(console.error);
