CREATE TABLE refunds (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    receipt_id VARCHAR(36) NOT NULL REFERENCES receipts(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    refund_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    approved_by VARCHAR(36) REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);
