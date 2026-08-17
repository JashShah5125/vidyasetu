CREATE TABLE student_fee_assignments (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    enrollment_id VARCHAR(36) NOT NULL UNIQUE REFERENCES student_enrollments(id) ON DELETE CASCADE,
    fee_plan_id VARCHAR(36) REFERENCES fee_plans(id) ON DELETE RESTRICT,
    gross_amount DECIMAL(10,2) NOT NULL,
    total_concession DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
