const pool = require('../config/db');

async function fixOtpCodesTable() {
    try {
        await pool.query("ALTER TABLE otp_codes MODIFY COLUMN mobile VARCHAR(20) NULL DEFAULT NULL");
        console.log('Successfully made mobile column nullable in otp_codes table.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to alter otp_codes table:', err);
        process.exit(1);
    }
}

fixOtpCodesTable();
