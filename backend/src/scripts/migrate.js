const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config/db');

const config = getDbConfig();

const runMigrations = async () => {
    let connection;
    try {
        console.log(`📡 Connecting to MySQL [${config.target.toUpperCase()}] server at ${config.host}:${config.port} as user '${config.user}'...`);
        
        connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            ...(config.ssl ? { ssl: config.ssl } : {}),
            multipleStatements: true
        });

        console.log(`📁 Ensuring database '${config.database}' exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.query(`USE \`${config.database}\`;`);

        // Create schema_migrations table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrationsDir = path.resolve(__dirname, '../../../migrations');
        if (!fs.existsSync(migrationsDir)) {
            throw new Error(`Migrations directory not found at: ${migrationsDir}`);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort((a, b) => {
                const numA = parseInt(a.split('_')[0], 10);
                const numB = parseInt(b.split('_')[0], 10);
                return numA - numB;
            });

        console.log(`🚀 Found ${files.length} migration scripts. Running in sequential order...\n`);

        for (const file of files) {
            // Check if already executed
            const [rows] = await connection.query(`SELECT migration_name FROM schema_migrations WHERE migration_name = ?`, [file]);
            if (rows.length > 0) {
                console.log(`⏩ [SKIP] ${file} (already executed)`);
                continue;
            }

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8').trim();

            if (!sql) {
                console.log(`⏩ [SKIP] ${file} (empty file)`);
                continue;
            }

            process.stdout.write(`⚙️  Running: ${file}... `);
            try {
                await connection.query(sql);
                await connection.query(`INSERT INTO schema_migrations (migration_name) VALUES (?)`, [file]);
                console.log(`✅ OK`);
            } catch (sqlErr) {
                console.log(`❌ ERROR`);
                console.error(`\nFailed executing ${file}:`);
                console.error(sqlErr.message || sqlErr);
                throw sqlErr;
            }
        }

        console.log(`\n🎉 All applicable migrations executed successfully on [${config.target.toUpperCase()}] database!`);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message || error.code || error);
        console.error(`💡 Please verify your MySQL server is running and your DB_${config.target.toUpperCase()}_* credentials in .env are correct.`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

runMigrations();

