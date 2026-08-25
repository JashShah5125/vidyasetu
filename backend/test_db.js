const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = require('./src/config/db');

async function checkDb() {
    try {
        const [rows] = await pool.query('SELECT id, tenant_id, name, email, user_type, status FROM users WHERE user_type = "saas_admin" OR email LIKE "%admin%"');
        console.log("DB Result:", rows);
    } catch (err) {
        console.error("DB Error:", err);
    }
}

checkDb();
