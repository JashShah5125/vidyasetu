const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { getDbConfig } = require('../config/db');

const seedMasterTenantV2 = async () => {
    let connection;
    try {
        console.log('Seeding Master Tenant (v2)...');
        const config = getDbConfig();
        
        connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            ...(config.ssl ? { ssl: config.ssl } : {}),
            multipleStatements: true
        });

        // All setup logic (tenants, users, etc.) has been moved to seeds_v2 sql files.
        const seedsDir = path.resolve(__dirname, '../../../seeds_v2');
        if (fs.existsSync(seedsDir)) {
            const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
            for (const file of files) {
                console.log(`Running seed file: ${file}`);
                const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
                if (sql.trim()) {
                    await connection.query(sql);
                }
            }
            console.log('Seed files executed.');
        } else {
            console.log(`No seed directory found at ${seedsDir}`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error during seeding:', error.message || error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

seedMasterTenantV2();
