CREATE TABLE app_devices (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    os_type VARCHAR(50),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    device_identifier VARCHAR(255) NOT NULL UNIQUE,
    last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
