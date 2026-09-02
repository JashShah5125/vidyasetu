-- Final schema: attendance_settings
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 054_create_attendance_settings.sql
CREATE TABLE attendance_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL UNIQUE,
    auto_lock_hours INTEGER NOT NULL DEFAULT 24,
    min_attendance_percentage INTEGER NOT NULL DEFAULT 75,
    allow_teacher_override TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
