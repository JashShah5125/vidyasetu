-- Migration: 131_create_staff_salary_payments_and_effective_date.sql
-- Description: Add salary_effective_from to staff_profiles and create staff_salary_payments table

-- 1. Add salary_effective_from to staff_profiles if it doesn't already exist
SET @dbname = DATABASE();
SET @tablename = "staff_profiles";
SET @columnname = "salary_effective_from";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE staff_profiles ADD COLUMN salary_effective_from DATE NULL AFTER salary_amount"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create staff_salary_payments table
CREATE TABLE IF NOT EXISTS staff_salary_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    staff_id INT NOT NULL,
    salary_month TINYINT NOT NULL,
    salary_year SMALLINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid_date DATE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    reference VARCHAR(150) NULL,
    remarks TEXT NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_ssp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssp_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssp_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT uk_staff_month_year UNIQUE KEY (tenant_id, branch_id, staff_id, salary_month, salary_year),
    INDEX idx_ssp_branch_period (tenant_id, branch_id, salary_year, salary_month),
    INDEX idx_ssp_staff_history (tenant_id, staff_id, paid_date DESC)
);
