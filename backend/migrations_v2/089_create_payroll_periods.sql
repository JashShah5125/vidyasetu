-- Final schema: payroll_periods
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 087_create_payroll_periods.sql
CREATE TABLE payroll_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    processed_at DATETIME,
    processed_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, month, year),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);
