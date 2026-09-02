-- Final schema: app_devices
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 018_create_app_devices.sql
CREATE TABLE app_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    device_name VARCHAR(255),
    os_type VARCHAR(50),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    device_identifier VARCHAR(255) NOT NULL UNIQUE,
    last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
