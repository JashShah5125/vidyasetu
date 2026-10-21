const pool = require('../config/db');

async function migrate() {
    try {
        const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'email_verified'");
        if (cols.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER email");
            await pool.query("ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER email_verified");
            console.log('Successfully added email_verified and email_verified_at to users table.');
        } else {
            console.log('Columns email_verified already exist.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
