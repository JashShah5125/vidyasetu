CREATE TABLE attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    session_id VARCHAR(36) NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    UNIQUE(session_id, enrollment_id)
);
