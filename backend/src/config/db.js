const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables from backend or root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Resolves database configuration based on the active target:
 * 'local' | 'office' | 'server' | 'staging' | 'test' (controlled via DB_TARGET env variable)
 */
const getDbConfig = (target = process.env.DB_TARGET || 'office') => {
    const selectedTarget = (target || 'office').toLowerCase().trim();

    let host, port, user, password, database, ssl;

    if (selectedTarget === 'office') {
        host = process.env.DB_OFFICE_HOST || process.env.DB_HOST || 'localhost';
        port = process.env.DB_OFFICE_PORT || process.env.DB_PORT || 3306;
        user = process.env.DB_OFFICE_USER || process.env.DB_USER || 'root';
        password = process.env.DB_OFFICE_PASSWORD !== undefined ? process.env.DB_OFFICE_PASSWORD : '';
        database = process.env.DB_OFFICE_NAME || process.env.DB_NAME || 'vidyasetu';
        ssl = process.env.DB_OFFICE_SSL === 'true' || process.env.DB_SSL === 'true';
    } else if (selectedTarget === 'server' || selectedTarget === 'production' || selectedTarget === 'prod' || selectedTarget === 'remote') {
        host = process.env.DB_SERVER_HOST || process.env.DB_PROD_HOST || process.env.DB_HOST || 'localhost';
        port = process.env.DB_SERVER_PORT || process.env.DB_PROD_PORT || process.env.DB_PORT || 3306;
        user = process.env.DB_SERVER_USER || process.env.DB_PROD_USER || process.env.DB_USER || 'root';
        password = process.env.DB_SERVER_PASSWORD !== undefined ? process.env.DB_SERVER_PASSWORD : (process.env.DB_PROD_PASSWORD !== undefined ? process.env.DB_PROD_PASSWORD : (process.env.DB_PASSWORD || ''));
        database = process.env.DB_SERVER_NAME || process.env.DB_PROD_NAME || process.env.DB_NAME || 'vidyasetu';
        ssl = process.env.DB_SERVER_SSL === 'true' || process.env.DB_SSL === 'true';
    } else if (selectedTarget === 'staging') {
        host = process.env.DB_STAGING_HOST || process.env.DB_HOST || 'localhost';
        port = process.env.DB_STAGING_PORT || process.env.DB_PORT || 3306;
        user = process.env.DB_STAGING_USER || process.env.DB_USER || 'root';
        password = process.env.DB_STAGING_PASSWORD !== undefined ? process.env.DB_STAGING_PASSWORD : (process.env.DB_PASSWORD || '');
        database = process.env.DB_STAGING_NAME || process.env.DB_NAME || 'vidyasetu';
        ssl = process.env.DB_STAGING_SSL === 'true' || process.env.DB_SSL === 'true';
    } else if (selectedTarget === 'test') {
        host = process.env.DB_TEST_HOST || process.env.DB_HOST || 'localhost';
        port = process.env.DB_TEST_PORT || process.env.DB_PORT || 3306;
        user = process.env.DB_TEST_USER || process.env.DB_USER || 'root';
        password = process.env.DB_TEST_PASSWORD !== undefined ? process.env.DB_TEST_PASSWORD : (process.env.DB_PASSWORD || '');
        database = process.env.DB_TEST_NAME || (process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'vidyasetu_test');
        ssl = process.env.DB_TEST_SSL === 'true' || process.env.DB_SSL === 'true';
    } else {
        // 'local' or default fallback
        host = process.env.DB_LOCAL_HOST || process.env.DB_HOST || 'localhost';
        port = process.env.DB_LOCAL_PORT || process.env.DB_PORT || 3306;
        user = process.env.DB_LOCAL_USER || process.env.DB_USER || 'root';
        password = process.env.DB_LOCAL_PASSWORD !== undefined ? process.env.DB_LOCAL_PASSWORD : (process.env.DB_PASSWORD || '');
        database = process.env.DB_LOCAL_NAME || process.env.DB_NAME || 'vidyasetu';
        ssl = process.env.DB_LOCAL_SSL === 'true' || process.env.DB_SSL === 'true';
    }

    const config = {
        target: selectedTarget,
        host,
        port: parseInt(port, 10),
        user,
        password,
        database
    };

    if (ssl) {
        config.ssl = { rejectUnauthorized: false };
    }

    return config;
};

const activeConfig = getDbConfig();

const pool = mysql.createPool({
    host: activeConfig.host,
    user: activeConfig.user,
    password: activeConfig.password,
    database: activeConfig.database,
    port: activeConfig.port,
    multipleStatements: true,
    ...(activeConfig.ssl ? { ssl: activeConfig.ssl } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`✅ [${activeConfig.target.toUpperCase()}] Database connected successfully (${activeConfig.host}:${activeConfig.port}/${activeConfig.database})!`);
        connection.release();
    } catch (error) {
        console.error(`❌ [${activeConfig.target.toUpperCase()}] Database connection failed (${activeConfig.host}:${activeConfig.port}/${activeConfig.database}):`, error.message || error.code || error);
    }
};

testConnection();

module.exports = pool;
module.exports.getDbConfig = getDbConfig;
