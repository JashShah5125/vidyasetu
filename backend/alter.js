const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_OFFICE_HOST,
        user: process.env.DB_OFFICE_USER,
        password: process.env.DB_OFFICE_PASSWORD,
        port: process.env.DB_OFFICE_PORT,
        database: process.env.DB_OFFICE_NAME
    });
    await connection.query("ALTER TABLE subscription_plans MODIFY COLUMN status ENUM('Active', 'Inactive', 'Deleted') NOT NULL DEFAULT 'Active';");
    await connection.end();
    console.log('DB Altered');
})();
