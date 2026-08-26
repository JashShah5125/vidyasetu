CREATE TABLE communication_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    channel VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
