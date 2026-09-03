const pool = require('../config/db');

async function updatePlatformSettings() {
    try {
        console.log('Altering platform_settings table...');
        await pool.query(`ALTER TABLE platform_settings ADD COLUMN deleted_at DATETIME NULL`);
        console.log('Added deleted_at column successfully.');
    } catch (e) {
        console.log('Column note:', e.message);
    }

    try {
        console.log('Seeding initial general platform settings...');
        const seeds = [
            ['general', 'saas_platform_name', 'Vidya Setu', 0],
            ['general', 'global_support_relay_email', 'support@vidyasetu.com', 0],
            ['general', 'default_gst_rate', '18', 0],
            ['general', 'platform_base_currency', 'INR', 0],
            ['general', 'admin_idle_timeout', '60', 0],
            ['general', 'plan_expiry_warning_days', '15', 0]
        ];

        for (const [cat, key, val, secret] of seeds) {
            await pool.query(
                `INSERT INTO platform_settings (category, key_name, value, is_secret) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
                [cat, key, val, secret]
            );
        }
        console.log('Seeded general settings successfully.');
    } catch (e) {
        console.error('Seed error:', e);
    } finally {
        process.exit(0);
    }
}

updatePlatformSettings();
