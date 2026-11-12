-- 112_create_sms_templates.sql
-- Create table for storing SMS message templates with soft deletion support and dynamic variables JSON

CREATE TABLE IF NOT EXISTS sms_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1 COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
    template_name VARCHAR(150) NOT NULL COMMENT 'Display name of template e.g., Fee Due Reminder, Exam Schedule Alert',
    template_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier key e.g., FEE_DUE_REMINDER',
    category VARCHAR(100) NOT NULL DEFAULT 'General' COMMENT 'Category: Fee & Billing, Admissions, Exams & Results, Attendance, System Alerts, General',
    dlt_template_id VARCHAR(100) NOT NULL COMMENT 'Distributed Ledger Technology ID for TRAI regulatory compliance',
    message_body TEXT NOT NULL COMMENT 'Raw SMS text body containing {{placeholders}}',
    variables JSON NULL COMMENT 'JSON map of placeholder keys and sample values',
    status ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active',
    created_by INT NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL COMMENT 'Soft deletion timestamp',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_dlt_id (dlt_template_id),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
