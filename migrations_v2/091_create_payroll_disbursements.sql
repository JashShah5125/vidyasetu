-- Final schema: payroll_disbursements
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 089_create_payroll_disbursements.sql
CREATE TABLE payroll_disbursements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    payroll_record_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    disbursed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (payroll_record_id) REFERENCES payroll_records(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
