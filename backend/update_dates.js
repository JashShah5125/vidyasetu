const pool = require('./src/config/db');

async function runUpdates() {
    try {
        console.log('Updating Bansal tenant dates...');
        
        await pool.query(
            "UPDATE tenants SET start_date = '2026-03-01', end_date = '2099-12-31', renewal_date = '2099-12-31' WHERE id = 7"
        );
        console.log('Updated Bansal Classes (ID=7)');

        console.log('All updates applied successfully!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

runUpdates();
