-- 129_create_branch_other_income_table.sql
CREATE TABLE IF NOT EXISTS `branch_other_income` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `income_record_number` VARCHAR(64) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `income_date` DATE NOT NULL,
  `payment_mode` VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `attachment_urls` JSON DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_other_income_tenant` (`tenant_id`),
  INDEX `idx_other_income_branch` (`branch_id`),
  INDEX `idx_other_income_date` (`income_date`),
  INDEX `idx_other_income_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
