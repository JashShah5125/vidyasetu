const { pool } = require('../config/db');

async function grantInstAdminPermissions() {
    try {
        console.log('Granting all system permissions to Institute Admin (role_id = 2)...');
        
        const promisePool = pool.promise ? pool.promise() : pool;
        const [result] = await promisePool.query(`
            INSERT IGNORE INTO role_permissions (role_id, permission_id)
            SELECT 2, id FROM permissions;
        `);

        console.log(`Successfully assigned permissions to Institute Admin! Affected rows: ${result.affectedRows}`);
        process.exit(0);
    } catch (err) {
        console.error('Error granting permissions:', err);
        process.exit(1);
    }
}

grantInstAdminPermissions();
