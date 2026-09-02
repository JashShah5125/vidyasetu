const pool = require('./src/config/db');

async function seedSettings() {
    try {
        console.log('Seeding platform_settings...');
        
        await pool.query(
            "INSERT IGNORE INTO platform_settings (category, key_name, value, is_secret) VALUES ('billing', 'plan_expiry_warning_days', '15', 0)"
        );

        console.log('Successfully seeded platform_settings!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

seedSettings();
