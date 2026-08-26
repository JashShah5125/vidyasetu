CREATE TABLE lecture_cancellations (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    lecture_id VARCHAR(36) NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    cancelled_by VARCHAR(36) REFERENCES users(id),
    compensatory_lecture_id VARCHAR(36) REFERENCES lectures(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
