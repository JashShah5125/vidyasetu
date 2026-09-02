-- Final schema: payroll_records
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 088_create_payroll_records.sql
CREATE TABLE payroll_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    period_id INT NOT NULL,
    staff_id INT NOT NULL,
    gross_salary DECIMAL(10,2) NOT NULL,
    total_deductions DECIMAL(10,2) NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'generated',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE RESTRICT
);
