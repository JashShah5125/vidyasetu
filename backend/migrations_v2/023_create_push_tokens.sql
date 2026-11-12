-- Final schema: push_tokens
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 022_create_push_tokens.sql
CREATE TABLE push_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    device_id INT,
    fcm_token TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES app_devices(id) ON DELETE CASCADE
);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
