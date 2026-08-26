CREATE TABLE guardians (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    occupation VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
