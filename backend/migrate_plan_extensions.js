const pool = require('./src/config/db');

async function migrate() {
    console.log('Starting migration to separate plan extensions...');
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Disable foreign key checks for a moment if needed (not strictly necessary but safe)
        // await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        // 1. Create extension tables
        console.log('Creating extension tables...');
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_features (
                plan_id INT NOT NULL PRIMARY KEY,
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
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_limits (
                plan_id INT NOT NULL PRIMARY KEY,
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
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_support (
                plan_id INT NOT NULL PRIMARY KEY,
                email_support TINYINT(1) NOT NULL DEFAULT 0,
                chat_support TINYINT(1) NOT NULL DEFAULT 0,
                phone_support TINYINT(1) NOT NULL DEFAULT 0,
                dedicated_account_manager TINYINT(1) NOT NULL DEFAULT 0,
                onboarding_assistance TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_branding (
                plan_id INT NOT NULL PRIMARY KEY,
                white_label TINYINT(1) NOT NULL DEFAULT 0,
                custom_domain TINYINT(1) NOT NULL DEFAULT 0,
                custom_logo TINYINT(1) NOT NULL DEFAULT 0,
                custom_email_templates TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_integrations (
                plan_id INT NOT NULL PRIMARY KEY,
                razorpay TINYINT(1) NOT NULL DEFAULT 0,
                cashfree TINYINT(1) NOT NULL DEFAULT 0,
                whatsapp_business TINYINT(1) NOT NULL DEFAULT 0,
                zoom TINYINT(1) NOT NULL DEFAULT 0,
                google_meet TINYINT(1) NOT NULL DEFAULT 0,
                google_calendar TINYINT(1) NOT NULL DEFAULT 0,
                biometric_devices TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            )
        `);

        // 2. Migrate data
        console.log('Migrating data...');
        
        await connection.query(`
            INSERT INTO plan_features (plan_id, admissions, student_management, parent_portal, teacher_portal, attendance, timetable, assignments, exams, results, doubts, fees, payroll, income, expenses, notifications, sms, whatsapp, email, reports, audit_logs, import_export, api_access)
            SELECT id, admissions, student_management, parent_portal, teacher_portal, attendance, timetable, assignments, exams, results, doubts, fees, payroll, income, expenses, notifications, sms, whatsapp, email, reports, audit_logs, import_export, api_access 
            FROM subscription_plans
            ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id)
        `);

        await connection.query(`
            INSERT INTO plan_limits (plan_id, max_instances, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs)
            SELECT id, max_instances, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs 
            FROM subscription_plans
            ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id)
        `);

        await connection.query(`
            INSERT INTO plan_support (plan_id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance)
            SELECT id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance
            FROM subscription_plans
            ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id)
        `);

        await connection.query(`
            INSERT INTO plan_branding (plan_id, white_label, custom_domain, custom_logo, custom_email_templates)
            SELECT id, white_label, custom_domain, custom_logo, custom_email_templates
            FROM subscription_plans
            ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id)
        `);

        await connection.query(`
            INSERT INTO plan_integrations (plan_id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices)
            SELECT id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices
            FROM subscription_plans
            ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id)
        `);

        // 3. Drop columns from subscription_plans
        console.log('Dropping columns from subscription_plans...');
        await connection.query(`
            ALTER TABLE subscription_plans
            DROP COLUMN admissions,
            DROP COLUMN student_management,
            DROP COLUMN parent_portal,
            DROP COLUMN teacher_portal,
            DROP COLUMN attendance,
            DROP COLUMN timetable,
            DROP COLUMN assignments,
            DROP COLUMN exams,
            DROP COLUMN results,
            DROP COLUMN doubts,
            DROP COLUMN fees,
            DROP COLUMN payroll,
            DROP COLUMN income,
            DROP COLUMN expenses,
            DROP COLUMN notifications,
            DROP COLUMN sms,
            DROP COLUMN whatsapp,
            DROP COLUMN email,
            DROP COLUMN reports,
            DROP COLUMN audit_logs,
            DROP COLUMN import_export,
            DROP COLUMN api_access,
            
            DROP COLUMN max_instances,
            DROP COLUMN max_branches,
            DROP COLUMN max_staff_users,
            DROP COLUMN max_students,
            DROP COLUMN max_parents,
            DROP COLUMN max_teachers,
            DROP COLUMN max_storage,
            DROP COLUMN max_file_size,
            DROP COLUMN max_sms_credits,
            DROP COLUMN max_whatsapp_msgs,
            
            DROP COLUMN email_support,
            DROP COLUMN chat_support,
            DROP COLUMN phone_support,
            DROP COLUMN dedicated_account_manager,
            DROP COLUMN onboarding_assistance,
            
            DROP COLUMN white_label,
            DROP COLUMN custom_domain,
            DROP COLUMN custom_logo,
            DROP COLUMN custom_email_templates,
            
            DROP COLUMN razorpay,
            DROP COLUMN cashfree,
            DROP COLUMN whatsapp_business,
            DROP COLUMN zoom,
            DROP COLUMN google_meet,
            DROP COLUMN google_calendar,
            DROP COLUMN biometric_devices
        `);

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

migrate();
