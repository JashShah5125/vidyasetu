CREATE TABLE doubt_messages (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    doubt_id VARCHAR(36) NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    sender_user_id INT NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
