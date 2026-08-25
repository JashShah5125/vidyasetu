CREATE TABLE payroll_disbursements (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    payroll_record_id VARCHAR(36) NOT NULL REFERENCES payroll_records(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    disbursed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36) REFERENCES users(id)
);
