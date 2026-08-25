const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_OFFICE_HOST || 'localhost',
    user: process.env.DB_OFFICE_USER || 'root',
    password: process.env.DB_OFFICE_PASSWORD || '',
    database: process.env.DB_OFFICE_NAME || 'vidyasetu',
    multipleStatements: true
  });
  
  try {
    const sql = fs.readFileSync('../migrations/112_merge_tenant_tables.sql', 'utf8');
    console.log('Running migration 112...');
    await connection.query(sql);
    console.log('Migration 112 executed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

run();
