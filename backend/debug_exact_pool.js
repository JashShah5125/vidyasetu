// Load the exact environment the backend uses
require('dotenv').config();
const db = require('./src/config/db');

async function checkPrograms() {
  try {
    // This uses the exact same pool that the backend uses
    const pool = db;
    
    const tenantId = 2;
    
    // Test all queries exactly as getAcademicOptions does
    const [courses] = await pool.query(
      'SELECT id, name FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC',
      [tenantId]
    );
    console.log('Courses:', courses.length, '->', courses.map(c => c.name).join(', '));
    
    const [programs] = await pool.query(
      'SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC',
      [tenantId]
    );
    console.log('Programs:', programs.length, '->', programs.map(p => `${p.name}(course=${p.course_id})`).join(', '));
    
    const [levels] = await pool.query(
      'SELECT id, course_id, program_id, name FROM levels WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC',
      [tenantId]
    );
    console.log('Levels:', levels.length);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message, err.sql);
    process.exit(1);
  }
}

checkPrograms();
