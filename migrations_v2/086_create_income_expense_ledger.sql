-- Final schema: income_expense_ledger
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 083_create_income_expense_ledger.sql
CREATE TABLE income_expense_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    head_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (head_id) REFERENCES income_expense_heads(id) ON DELETE RESTRICT
);
