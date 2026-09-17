-- Migration: 137_create_branch_other_expenses_table.sql
-- Creates the branch_other_expenses table for tracking miscellaneous operational expenses

CREATE TABLE IF NOT EXISTS `branch_other_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `expense_record_number` VARCHAR(64) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Other Expenses',
  `description` TEXT DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `expense_date` DATE NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=Approved, 2=Paid, 3=Rejected',
  `payment_mode` VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `payee` VARCHAR(255) DEFAULT NULL,
  `attachment_urls` JSON DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_other_expense_tenant` (`tenant_id`),
  INDEX `idx_other_expense_branch` (`branch_id`),
  INDEX `idx_other_expense_date` (`expense_date`),
  INDEX `idx_other_expense_status` (`status`),
  INDEX `idx_other_expense_category` (`category`),
  INDEX `idx_other_expense_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
