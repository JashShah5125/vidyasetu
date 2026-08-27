CREATE TABLE payment_transactions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    receipt_id VARCHAR(36) NOT NULL REFERENCES receipts(id) ON DELETE RESTRICT,
    payment_mode VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    gateway_response JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);
