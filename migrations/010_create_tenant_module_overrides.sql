CREATE TABLE tenant_module_overrides (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id VARCHAR(36) NOT NULL REFERENCES module_registry(id) ON DELETE CASCADE,
    is_enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(tenant_id, module_id)
);
