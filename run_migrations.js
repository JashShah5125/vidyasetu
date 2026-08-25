const pool = require('./backend/src/config/db');
const fs = require('fs');
const path = require('path');

async function runSQLFile(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Split by semicolons and execute, handling multi-line statements.
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        try {
            await pool.query(stmt);
            console.log(`Executed: ${stmt.substring(0, 50)}...`);
        } catch (error) {
            console.error(`Error executing: ${stmt.substring(0, 50)}...`, error);
        }
    }
}

async function main() {
    try {
        console.log('Running 109_create_saas_payments.sql...');
        await runSQLFile(path.join(__dirname, 'migrations/109_create_saas_payments.sql'));
        
        console.log('Running 06_seed_domain_b_permissions.sql...');
        await runSQLFile(path.join(__dirname, 'migrations/seeds/06_seed_domain_b_permissions.sql'));

        console.log('Migrations and seeds completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

main();
