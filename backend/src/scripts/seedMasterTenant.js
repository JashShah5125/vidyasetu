require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MASTER_TENANT_ID = process.env.MASTER_TENANT_ID || 'vidyasetu-master-hq-id';

const seedMasterTenant = async () => {
    try {
        console.log('Seeding Master Tenant...');

        // 1. Create Master Tenant
        await pool.query(`
            INSERT IGNORE INTO tenants (id, name, slug, code, status) 
            VALUES (?, 'VidyaSetu HQ', 'master', 'HQ', 'active')
        `, [MASTER_TENANT_ID]);
        
        console.log('Master Tenant created or already exists.');

        // 2. Create SaaS Admin User
        const adminEmail = 'admin@vidyasetu.com';
        const passwordHash = await bcrypt.hash('password123', 10);
        const adminId = uuidv4();

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        
        if (existing.length === 0) {
            await pool.query(`
                INSERT INTO users (id, tenant_id, name, email, password_hash, user_type, status)
                VALUES (?, ?, 'Super Admin', ?, ?, 'saas_admin', 'active')
            `, [adminId, MASTER_TENANT_ID, adminEmail, passwordHash]);
            console.log('SaaS Admin user created: admin@vidyasetu.com / password123');
        } else {
            console.log('SaaS Admin user already exists.');
        }

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

seedMasterTenant();
