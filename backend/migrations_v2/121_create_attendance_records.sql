-- Migration 121: Attendance Records (simplified singleton design)
-- Replaces the earlier sessions-based design (attendance_sessions, settings, correction requests).
--
-- Design decisions:
-- - One attendance_records row per (lecture_id, student_id) => UNIQUE(lecture_id, student_id)
-- - status is TINYINT: 0 = absent, 1 = present, 2 = late
-- - Attendance lifecycle state is stored directly on `lectures`
--   (attendance_taken TINYINT: 1 = taken, 0 = not taken, plus submitted/locked audit columns)
-- - Settings, sessions and correction-request tables are intentionally omitted.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS attendance_correction_requests;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS attendance_settings;

CREATE TABLE attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    lecture_id INT NOT NULL,
    student_id INT NOT NULL,
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0=absent, 1=present, 2=late',
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    UNIQUE(lecture_id, student_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE INDEX idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_lecture ON attendance_records(lecture_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);

-- Add attendance lifecycle columns to lectures
ALTER TABLE lectures
    ADD COLUMN attendance_taken TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = attendance taken, 0 = not taken',
    ADD COLUMN attendance_submitted_at DATETIME DEFAULT NULL,
    ADD COLUMN attendance_submitted_by INT DEFAULT NULL,
    ADD COLUMN attendance_locked_at DATETIME DEFAULT NULL,
    ADD COLUMN attendance_locked_by INT DEFAULT NULL;

SET FOREIGN_KEY_CHECKS = 1;