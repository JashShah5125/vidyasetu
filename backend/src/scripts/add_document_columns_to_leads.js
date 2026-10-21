const pool = require('../config/db');

async function migrate() {
    try {
        console.log('--- Migrating saas_leads table for document columns ---');
        const [leadCols] = await pool.query("SHOW COLUMNS FROM saas_leads LIKE 'reg_doc_url'");
        if (leadCols.length === 0) {
            await pool.query(`
                ALTER TABLE saas_leads
                ADD COLUMN reg_doc_url TEXT NULL AFTER remarks,
                ADD COLUMN pan_doc_url TEXT NULL AFTER reg_doc_url,
                ADD COLUMN admin_id_doc_url TEXT NULL AFTER pan_doc_url,
                ADD COLUMN gst_doc_url TEXT NULL AFTER admin_id_doc_url,
                ADD COLUMN logo_url TEXT NULL AFTER gst_doc_url
            `);
            console.log('Added document columns to saas_leads.');
        } else {
            console.log('saas_leads document columns already exist.');
        }

        console.log('--- Migrating tenants table for document columns ---');
        const [tenantCols] = await pool.query("SHOW COLUMNS FROM tenants LIKE 'reg_doc_url'");
        if (tenantCols.length === 0) {
            await pool.query(`
                ALTER TABLE tenants
                ADD COLUMN reg_doc_url TEXT NULL AFTER pan_number,
                ADD COLUMN pan_doc_url TEXT NULL AFTER reg_doc_url,
                ADD COLUMN admin_id_doc_url TEXT NULL AFTER pan_doc_url,
                ADD COLUMN gst_doc_url TEXT NULL AFTER admin_id_doc_url
            `);
            console.log('Added document columns to tenants.');
        } else {
            console.log('tenants document columns already exist.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
