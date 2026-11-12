CREATE TABLE fee_plan_installments (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    fee_plan_id VARCHAR(36) NOT NULL REFERENCES fee_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    due_days_from_start INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
