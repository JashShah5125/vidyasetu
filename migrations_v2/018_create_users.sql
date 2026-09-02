-- Final schema: users
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 017_create_users.sql, 100_fix_users_email_not_null.sql, 116_add_must_change_password.sql
-- Note: 110 changed users.id to VARCHAR(36) — OVERRIDDEN. All IDs remain INT per project requirement.
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    password_hash VARCHAR(255),
    user_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    app_access_suspended TINYINT(1) NOT NULL DEFAULT 0,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    password_generated_at DATETIME NULL,
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_users_email ON users(tenant_id, email);
CREATE UNIQUE INDEX idx_users_mobile ON users(tenant_id, mobile);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_type ON users(tenant_id, user_type);
CREATE INDEX idx_users_status ON users(tenant_id, status);
CREATE INDEX idx_users_email_only ON users(email);

-- Add FK for tenants.primary_admin_user_id now that users table exists
ALTER TABLE tenants
    ADD CONSTRAINT fk_tenants_primary_admin
    FOREIGN KEY (primary_admin_user_id) REFERENCES users(id) ON DELETE SET NULL;
