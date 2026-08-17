CREATE TABLE income_expense_ledger (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    head_id VARCHAR(36) NOT NULL REFERENCES income_expense_heads(id) ON DELETE RESTRICT,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
