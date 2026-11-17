-- Migration 144: Sprint 2 Attendance Geo-Fencing & Correction Audit Trail
-- 1. Branch geo-fence configuration columns
-- 2. Lecture submission geolocation verification columns
-- 3. Attendance corrections audit table

ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL,
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL,
    ADD COLUMN IF NOT EXISTS geofence_radius_meters INT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS geofence_enabled TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE lectures
    ADD COLUMN IF NOT EXISTS submitted_latitude DECIMAL(10, 8) NULL,
    ADD COLUMN IF NOT EXISTS submitted_longitude DECIMAL(11, 8) NULL,
    ADD COLUMN IF NOT EXISTS submitted_accuracy_meters FLOAT NULL,
    ADD COLUMN IF NOT EXISTS geofence_distance_meters FLOAT NULL,
    ADD COLUMN IF NOT EXISTS geofence_status VARCHAR(30) NULL;

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

