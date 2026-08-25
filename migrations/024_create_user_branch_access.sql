CREATE TABLE user_branch_access (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36) REFERENCES users(id),
    revoked_at DATETIME,
    UNIQUE(user_id, branch_id)
);
