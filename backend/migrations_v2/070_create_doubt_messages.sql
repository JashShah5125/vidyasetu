-- Final schema: doubt_messages
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 067_create_doubt_messages.sql
CREATE TABLE doubt_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    doubt_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id)
);
