CREATE TABLE payment_installment_links (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    payment_id VARCHAR(36) NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    installment_id VARCHAR(36) NOT NULL REFERENCES student_installments(id) ON DELETE RESTRICT,
    amount_allocated DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
