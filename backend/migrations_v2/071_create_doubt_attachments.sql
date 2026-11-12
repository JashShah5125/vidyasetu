-- Final schema: doubt_attachments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 068_create_doubt_attachments.sql
CREATE TABLE doubt_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    message_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (message_id) REFERENCES doubt_messages(id) ON DELETE CASCADE
);
