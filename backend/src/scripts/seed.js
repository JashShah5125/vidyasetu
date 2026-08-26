const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const MASTER_TENANT_ID = process.env.MASTER_TENANT_ID || 1;

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
        const passwordHash = await bcrypt.hash('admin123', 10);

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        
        if (existing.length === 0) {
            await pool.query(`
                INSERT INTO users (tenant_id, name, email, password_hash, user_type, status)
                VALUES (?, 'Super Admin', ?, ?, 'saas_admin', 'active')
            `, [MASTER_TENANT_ID, adminEmail, passwordHash]);
            console.log('SaaS Admin user created: admin@vidyasetu.com / admin123');
        } else {
            await pool.query(`
                UPDATE users SET password_hash = ? WHERE email = ?
            `, [passwordHash, adminEmail]);
            console.log('SaaS Admin password updated: admin@vidyasetu.com / admin123');
        }

        // 3. Run all seed SQL files from migrations/seeds
        const fs = require('fs');
        const seedsDir = path.resolve(__dirname, '../../../migrations/seeds');
        if (fs.existsSync(seedsDir)) {
            const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
            for (const file of files) {
                console.log(`Running seed file: ${file}`);
                const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
                if (sql.trim()) {
                    await pool.query(sql);
                }
            }
            console.log('Seed files executed.');
        } else {
            console.log(`No seed directory found at ${seedsDir}`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

seedMasterTenant();
