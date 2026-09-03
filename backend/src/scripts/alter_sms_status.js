const db = require('../config/db');

async function alterStatusColumn() {
  try {
    console.log('Modifying status column in sms_templates table...');
    await db.query(`
      ALTER TABLE sms_templates 
      MODIFY COLUMN status ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active';
    `);
    console.log('Status column modified successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error modifying status column:', error);
    process.exit(1);
  }
}

alterStatusColumn();
