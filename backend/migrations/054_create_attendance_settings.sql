CREATE TABLE attendance_settings (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
    auto_lock_hours INTEGER NOT NULL DEFAULT 24,
    min_attendance_percentage INTEGER NOT NULL DEFAULT 75,
    allow_teacher_override TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
