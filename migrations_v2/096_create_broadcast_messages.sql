-- Final schema: broadcast_messages
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 094_create_broadcast_messages.sql
CREATE TABLE broadcast_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    batch_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (teacher_user_id) REFERENCES users(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);
