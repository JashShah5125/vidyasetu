CREATE TABLE fee_plans (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    academic_year_id VARCHAR(36) NOT NULL REFERENCES academic_years(id),
    level_id VARCHAR(36) REFERENCES levels(id),
    name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2),
    months INTEGER,
    installment_amount DECIMAL(10,2),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
