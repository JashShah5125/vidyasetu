const pool = require('./db');

const addColumnIfMissing = async (tableName, columnName, columnDef) => {
    const [cols] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );
    if (cols.length === 0) {
        await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`);
    }
};

/**
 * Self-healing schema setup for Sprint 2 (Branch Geo-Fencing & Attendance Corrections).
 * Runs safely at server startup so columns/tables exist even if migrations haven't been run manually.
 */
const ensureSprint2GeofencingSchema = async () => {
    try {
        await addColumnIfMissing('branches', 'latitude', 'DECIMAL(10, 8) NULL');
        await addColumnIfMissing('branches', 'longitude', 'DECIMAL(11, 8) NULL');
        await addColumnIfMissing('branches', 'geofence_radius_meters', 'INT NOT NULL DEFAULT 100');
        await addColumnIfMissing('branches', 'geofence_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');

        await addColumnIfMissing('lectures', 'submitted_latitude', 'DECIMAL(10, 8) NULL');
        await addColumnIfMissing('lectures', 'submitted_longitude', 'DECIMAL(11, 8) NULL');
        await addColumnIfMissing('lectures', 'submitted_accuracy_meters', 'FLOAT NULL');
        await addColumnIfMissing('lectures', 'geofence_distance_meters', 'FLOAT NULL');
        await addColumnIfMissing('lectures', 'geofence_status', 'VARCHAR(30) NULL');
        await addColumnIfMissing('lectures', 'student_checkin_open', 'TINYINT(1) NOT NULL DEFAULT 0');
        await addColumnIfMissing('lectures', 'student_checkin_code', 'VARCHAR(10) NULL');
        await addColumnIfMissing('lectures', 'student_checkin_opened_at', 'DATETIME NULL');

        await addColumnIfMissing('attendance_records', 'student_checkin_at', 'DATETIME NULL');
        await addColumnIfMissing('attendance_records', 'student_checkin_latitude', 'DECIMAL(10, 8) NULL');
        await addColumnIfMissing('attendance_records', 'student_checkin_longitude', 'DECIMAL(11, 8) NULL');
        await addColumnIfMissing('attendance_records', 'student_checkin_accuracy_meters', 'FLOAT NULL');
        await addColumnIfMissing('attendance_records', 'student_checkin_distance_meters', 'FLOAT NULL');
        await addColumnIfMissing('attendance_records', 'student_checkin_geofence_status', 'VARCHAR(30) NULL');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_corrections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                branch_id INT NULL,
                lecture_id INT NOT NULL,
                student_id INT NOT NULL,
                old_status TINYINT NULL COMMENT '0=absent, 1=present, 2=late, NULL=unmarked',
                new_status TINYINT NOT NULL COMMENT '0=absent, 1=present, 2=late',
                old_remarks TEXT NULL,
                new_remarks TEXT NULL,
                reason TEXT NOT NULL,
                corrected_by INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ac_tenant_lecture (tenant_id, lecture_id),
                INDEX idx_ac_student (student_id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (corrected_by) REFERENCES users(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    } catch (error) {
        console.warn('⚠️ [Sprint2 Geofencing Schema] Notice:', error.message);
    }
};

module.exports = { ensureSprint2GeofencingSchema };

