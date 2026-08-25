CREATE TABLE doubt_attachments (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    message_id VARCHAR(36) NOT NULL REFERENCES doubt_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
