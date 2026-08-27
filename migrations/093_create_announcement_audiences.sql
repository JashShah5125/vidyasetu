CREATE TABLE announcement_audiences (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    announcement_id VARCHAR(36) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
