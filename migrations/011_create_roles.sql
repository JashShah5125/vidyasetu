CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
CREATE UNIQUE INDEX idx_roles_system_code ON roles(code);
CREATE UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code);
