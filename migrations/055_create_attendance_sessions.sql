CREATE TABLE attendance_sessions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    lecture_id VARCHAR(36) NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME,
    submitted_by VARCHAR(36) REFERENCES users(id),
    locked_at DATETIME,
    locked_by VARCHAR(36) REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
