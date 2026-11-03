const pool = require('../src/config/db');

async function runExamMigration() {
    console.log('🚀 Running Migration: Examinations, Test Types, and Marks Roster...');
    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Create `exams` table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`exams\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`branch_id\` INT NULL,
                \`academic_year_id\` INT NULL,
                \`course_id\` INT NULL,
                \`subject_id\` INT NULL,
                \`batch_id\` INT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`exam_type\` ENUM(
                    'Daily Test',
                    'Weekly Test',
                    'Fortnightly Test',
                    'Monthly Test',
                    'Unit Test',
                    'Chapter Test',
                    'Mock Test',
                    'Term Exam',
                    'Final Exam',
                    'Assignment',
                    'Internal Assessment',
                    'Other'
                ) NOT NULL DEFAULT 'Weekly Test',
                \`exam_date\` DATE NULL,
                \`start_time\` TIME NULL,
                \`end_time\` TIME NULL,
                \`duration\` VARCHAR(50) NULL DEFAULT '60 mins',
                \`total_marks\` DECIMAL(6,2) NOT NULL DEFAULT 100.00,
                \`passing_marks\` DECIMAL(6,2) NOT NULL DEFAULT 40.00,
                \`class_average\` VARCHAR(20) DEFAULT 'TBD',
                \`status\` ENUM(
                    'Draft',
                    'Scheduled',
                    'In Progress',
                    'Completed',
                    'Marks Pending',
                    'Marks Published',
                    'Cancelled'
                ) NOT NULL DEFAULT 'Scheduled',
                \`instructions\` TEXT NULL,
                \`created_by\` INT NULL,
                \`updated_by\` INT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` TIMESTAMP NULL,
                INDEX \`idx_exams_tenant_branch\` (\`tenant_id\`, \`branch_id\`),
                INDEX \`idx_exams_tenant_batch\` (\`tenant_id\`, \`batch_id\`),
                INDEX \`idx_exams_tenant_status\` (\`tenant_id\`, \`status\`),
                INDEX \`idx_exams_date\` (\`exam_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table `exams` ready.');

        // 2. Create `exam_marks` table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`exam_marks\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`exam_id\` INT NOT NULL,
                \`student_id\` INT NOT NULL,
                \`marks_obtained\` DECIMAL(6,2) NULL,
                \`is_absent\` TINYINT(1) NOT NULL DEFAULT 0,
                \`is_passed\` TINYINT(1) DEFAULT NULL,
                \`percentage\` DECIMAL(5,2) NULL,
                \`grade\` VARCHAR(10) NULL,
                \`remarks\` VARCHAR(255) NULL,
                \`created_by\` INT NULL,
                \`updated_by\` INT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY \`uk_exam_student\` (\`exam_id\`, \`student_id\`),
                INDEX \`idx_marks_tenant_student\` (\`tenant_id\`, \`student_id\`),
                INDEX \`idx_marks_exam_passed\` (\`exam_id\`, \`is_passed\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table `exam_marks` ready.');

        // 3. Create `exam_marks_audit` table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`exam_marks_audit\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`exam_id\` INT NOT NULL,
                \`student_id\` INT NOT NULL,
                \`old_marks\` DECIMAL(6,2) NULL,
                \`new_marks\` DECIMAL(6,2) NULL,
                \`changed_by\` INT NULL,
                \`change_reason\` VARCHAR(255) NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_audit_exam_student\` (\`exam_id\`, \`student_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table `exam_marks_audit` ready.');

        console.log('🎉 Examination and Marks Roster migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        if (connection) connection.release();
    }
}

if (require.main === module) {
    runExamMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runExamMigration;

