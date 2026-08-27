const pool = require('./src/config/db');
require('dotenv').config({path: '../.env'});

async function run() {
    const conn = await pool.getConnection();

    try {
        await conn.query('START TRANSACTION');
        
        // 1. Fetch all data
        const [plans] = await conn.query('SELECT * FROM subscription_plans');
        
        // Helper to fetch details
        const getRows = async (table) => {
            const [rows] = await conn.query(`SELECT * FROM ${table}`);
            return rows;
        };
        
        const billing = await getRows('plan_billing');
        const features = await getRows('plan_feature_access');
        const limits = await getRows('plan_resource_limits');
        const support = await getRows('plan_support');
        const branding = await getRows('plan_branding');
        const integrations = await getRows('plan_integrations');
        const visibility = await getRows('plan_visibility');

        // 2. Map data
        const newPlans = plans.map(p => {
            const id = p.id;
            const pb = billing.filter(b => b.plan_id === id);
            const pf = features.find(f => f.plan_id === id) || {};
            const pl = limits.find(l => l.plan_id === id) || {};
            const ps = support.find(s => s.plan_id === id) || {};
            const pbr = branding.find(b => b.plan_id === id) || {};
            const pi = integrations.find(i => i.plan_id === id) || {};
            const pv = visibility.filter(v => v.plan_id === id).map(v => v.tenant_id);

            // Extract prices
            const getPrice = (type) => pb.find(b => b.billing_type === type)?.price || 0.00;
            
            // Assume currency, trial_days, setup_fee, auto_renewal from the first billing option if exists
            const baseBilling = pb[0] || {};
            
            return {
                ...p,
                monthly_price: getPrice('Monthly'),
                quarterly_price: getPrice('Quarterly'),
                half_yearly_price: getPrice('Half-Yearly'),
                yearly_price: getPrice('Yearly'),
                lifetime_price: getPrice('Lifetime'),
                currency: baseBilling.currency || 'INR',
                trial_days: baseBilling.trial_days || 0,
                setup_fee: baseBilling.setup_fee || 0.00,
                auto_renewal: baseBilling.auto_renewal || 0,
                
                ...pf, ...pl, ...ps, ...pbr, ...pi,
                visible_to: pv.length > 0 ? JSON.stringify(pv) : JSON.stringify(['All'])
            };
        });

        // 3. Drop FK from tenants
        try {
            await conn.query('ALTER TABLE tenants DROP FOREIGN KEY fk_tenants_plan_id');
        } catch(e) { console.log("FK might not exist or named differently"); }

        // 4. Create new table
        await conn.query(`
            CREATE TABLE subscription_plans_new (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(50) NOT NULL,
                description TEXT,
                status ENUM('Active','Inactive','Deleted') NOT NULL DEFAULT 'Active',
                display_order INT NOT NULL DEFAULT 0,
                notes TEXT,
                
                monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                quarterly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                half_yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                lifetime_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                trial_days INT NOT NULL DEFAULT 0,
                setup_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                auto_renewal TINYINT(1) NOT NULL DEFAULT 0,
                
                max_instances INT NOT NULL DEFAULT -1,
                max_branches INT NOT NULL DEFAULT -1,
                max_staff_users INT NOT NULL DEFAULT -1,
                max_students INT NOT NULL DEFAULT -1,
                max_parents INT NOT NULL DEFAULT -1,
                max_teachers INT NOT NULL DEFAULT -1,
                max_storage VARCHAR(50) NOT NULL DEFAULT '-1',
                max_file_size VARCHAR(50) NOT NULL DEFAULT '-1',
                max_sms_credits INT NOT NULL DEFAULT -1,
                max_whatsapp_msgs INT NOT NULL DEFAULT -1,
                
                admissions TINYINT(1) NOT NULL DEFAULT 0,
                student_management TINYINT(1) NOT NULL DEFAULT 0,
                parent_portal TINYINT(1) NOT NULL DEFAULT 0,
                teacher_portal TINYINT(1) NOT NULL DEFAULT 0,
                attendance TINYINT(1) NOT NULL DEFAULT 0,
                timetable TINYINT(1) NOT NULL DEFAULT 0,
                assignments TINYINT(1) NOT NULL DEFAULT 0,
                exams TINYINT(1) NOT NULL DEFAULT 0,
                results TINYINT(1) NOT NULL DEFAULT 0,
                doubts TINYINT(1) NOT NULL DEFAULT 0,
                fees TINYINT(1) NOT NULL DEFAULT 0,
                payroll TINYINT(1) NOT NULL DEFAULT 0,
                income TINYINT(1) NOT NULL DEFAULT 0,
                expenses TINYINT(1) NOT NULL DEFAULT 0,
                notifications TINYINT(1) NOT NULL DEFAULT 0,
                sms TINYINT(1) NOT NULL DEFAULT 0,
                whatsapp TINYINT(1) NOT NULL DEFAULT 0,
                email TINYINT(1) NOT NULL DEFAULT 0,
                reports TINYINT(1) NOT NULL DEFAULT 0,
                audit_logs TINYINT(1) NOT NULL DEFAULT 0,
                import_export TINYINT(1) NOT NULL DEFAULT 0,
                api_access TINYINT(1) NOT NULL DEFAULT 0,
                
                email_support TINYINT(1) NOT NULL DEFAULT 0,
                chat_support TINYINT(1) NOT NULL DEFAULT 0,
                phone_support TINYINT(1) NOT NULL DEFAULT 0,
                dedicated_account_manager TINYINT(1) NOT NULL DEFAULT 0,
                onboarding_assistance TINYINT(1) NOT NULL DEFAULT 0,
                
                white_label TINYINT(1) NOT NULL DEFAULT 0,
                custom_domain TINYINT(1) NOT NULL DEFAULT 0,
                custom_logo TINYINT(1) NOT NULL DEFAULT 0,
                custom_email_templates TINYINT(1) NOT NULL DEFAULT 0,
                
                razorpay TINYINT(1) NOT NULL DEFAULT 0,
                cashfree TINYINT(1) NOT NULL DEFAULT 0,
                whatsapp_business TINYINT(1) NOT NULL DEFAULT 0,
                zoom TINYINT(1) NOT NULL DEFAULT 0,
                google_meet TINYINT(1) NOT NULL DEFAULT 0,
                google_calendar TINYINT(1) NOT NULL DEFAULT 0,
                biometric_devices TINYINT(1) NOT NULL DEFAULT 0,
                
                visible_to JSON,
                
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME,
                created_by INT,
                updated_by INT,
                
                PRIMARY KEY (id),
                UNIQUE KEY code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. Insert data
        for (const p of newPlans) {
            delete p.plan_id; // remove foreign keys from flat objects
            
            // Format dates
            const toSqlDate = (d) => d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : null;
            
            const cols = Object.keys(p);
            const vals = Object.values(p).map(v => v instanceof Date ? toSqlDate(v) : v);
            
            const sql = `INSERT INTO subscription_plans_new (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
            await conn.query(sql, vals);
        }

        // 6. Drop old tables
        await conn.query('DROP TABLE IF EXISTS plan_billing');
        await conn.query('DROP TABLE IF EXISTS plan_feature_access');
        await conn.query('DROP TABLE IF EXISTS plan_resource_limits');
        await conn.query('DROP TABLE IF EXISTS plan_support');
        await conn.query('DROP TABLE IF EXISTS plan_branding');
        await conn.query('DROP TABLE IF EXISTS plan_integrations');
        await conn.query('DROP TABLE IF EXISTS plan_visibility');
        
        await conn.query('RENAME TABLE subscription_plans TO subscription_plans_backup, subscription_plans_new TO subscription_plans');
        
        // 7. Add FK back
        try {
            await conn.query('ALTER TABLE tenants ADD CONSTRAINT fk_tenants_plan_id FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL');
        } catch(e) { console.log("Failed to add FK:", e.message); }
        
        await conn.query('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await conn.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        await conn.end();
    }
}
run();
