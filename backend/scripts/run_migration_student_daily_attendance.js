const pool = require('../src/config/db');

async function migrateStudentDailyAttendance() {
    console.log('🔄 Running migration for student_daily_attendance table...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_daily_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                branch_id INT NULL,
                batch_id INT NULL,
                student_id INT NOT NULL,
                attendance_date DATE NOT NULL,
                status TINYINT NOT NULL DEFAULT 1 COMMENT '0=absent, 1=present, 2=late',
                remarks VARCHAR(255) NULL,
                marked_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_tenant_student_date (tenant_id, student_id, attendance_date),
                INDEX idx_tenant_date (tenant_id, attendance_date),
                INDEX idx_tenant_batch_date (tenant_id, batch_id, attendance_date),
                INDEX idx_tenant_branch_date (tenant_id, branch_id, attendance_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ student_daily_attendance table created or verified.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrateStudentDailyAttendance();

