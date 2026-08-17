CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(20),
    password_hash VARCHAR(255),
    user_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    app_access_suspended TINYINT(1) NOT NULL DEFAULT 0,
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
CREATE UNIQUE INDEX idx_users_email ON users(tenant_id, email);
CREATE UNIQUE INDEX idx_users_mobile ON users(tenant_id, mobile);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_type ON users(tenant_id, user_type);
CREATE INDEX idx_users_status ON users(tenant_id, status);
