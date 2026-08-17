CREATE TABLE ledger_approvals (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    ledger_id VARCHAR(36) NOT NULL REFERENCES income_expense_ledger(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at DATETIME,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
