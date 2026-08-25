CREATE TABLE attendance_correction_requests (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    session_id VARCHAR(36) NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    requested_by VARCHAR(36) NOT NULL REFERENCES users(id),
    original_status VARCHAR(20) NOT NULL,
    requested_status VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(36) REFERENCES users(id),
    resolved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
