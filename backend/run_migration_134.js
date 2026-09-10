const pool = require('./src/config/db');

async function runMigration() {
    try {
        console.log('Altering staff_profiles.status to ENUM...');
        await pool.query(`ALTER TABLE staff_profiles MODIFY COLUMN status ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active'`);
        console.log('✅ staff_profiles.status successfully updated to ENUM(\'active\', \'inactive\', \'deleted\')');

        console.log('Altering users.status to ENUM...');
        await pool.query(`ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'deleted') NOT NULL DEFAULT 'active'`);
        console.log('✅ users.status successfully updated to ENUM(\'active\', \'inactive\', \'suspended\', \'deleted\')');

        console.log('Migration 134 completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration 134 failed:', err);
        process.exit(1);
    }
}

runMigration();
