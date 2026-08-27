CREATE TABLE broadcast_messages (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    teacher_user_id INT NOT NULL REFERENCES users(id),
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
