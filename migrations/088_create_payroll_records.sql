CREATE TABLE payroll_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    period_id VARCHAR(36) NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    staff_id VARCHAR(36) NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
    gross_salary DECIMAL(10,2) NOT NULL,
    total_deductions DECIMAL(10,2) NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'generated',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT
);
