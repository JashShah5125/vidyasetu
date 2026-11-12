-- Final schema: fee_plans
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 070_create_fee_plans.sql, 110_fix_database_schema_inconsistencies.sql
-- Changes: added down_payment, months, installment_amount
CREATE TABLE fee_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    level_id INT,
    name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2),
    months INT,
    installment_amount DECIMAL(10,2),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (level_id) REFERENCES levels(id)
);
