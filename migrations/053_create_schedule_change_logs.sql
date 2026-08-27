CREATE TABLE schedule_change_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    lecture_id VARCHAR(36) NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by VARCHAR(36) REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
