-- Final schema: fee_plan_installments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 072_create_fee_plan_installments.sql
CREATE TABLE fee_plan_installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    fee_plan_id INT NOT NULL,
    installment_number INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    due_days_from_start INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE CASCADE
);
