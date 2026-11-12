-- Migration 111: system_configurations
-- Stores per-tenant channel configuration (SMS, EMAIL, WHATSAPP)
-- Each tenant has exactly one active config per channel.
-- All IDs: INT AUTO_INCREMENT

CREATE TABLE IF NOT EXISTS system_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    channel_type ENUM('SMS', 'EMAIL', 'WHATSAPP') NOT NULL,
    provider_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    credentials JSON NOT NULL,
    sender_id VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    UNIQUE KEY unique_tenant_channel (tenant_id, channel_type),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_configurations_tenant ON system_configurations(tenant_id);
CREATE INDEX idx_system_configurations_channel ON system_configurations(channel_type);
