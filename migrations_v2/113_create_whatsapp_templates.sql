-- 113_create_whatsapp_templates.sql
-- Create table for storing WhatsApp Business templates with rich media support, variables JSON and soft deletion

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1 COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
    template_name VARCHAR(150) NOT NULL COMMENT 'Display name of WhatsApp template',
    template_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier key e.g., FEE_REMINDER_WA',
    category VARCHAR(100) NOT NULL DEFAULT 'MARKETING' COMMENT 'Category: MARKETING, UTILITY, AUTHENTICATION, Fee & Billing, Admissions, General',
    dlt_template_id VARCHAR(100) NOT NULL COMMENT 'DLT / Meta WhatsApp Template ID for compliance',
    header_type ENUM('none', 'text', 'image', 'video', 'document') NOT NULL DEFAULT 'none',
    header_content TEXT NULL COMMENT 'Header text or rich media asset URL',
    message_body TEXT NOT NULL COMMENT 'Raw WhatsApp message text with *bold*, _italic_, and {{placeholders}}',
    footer_text VARCHAR(255) NULL COMMENT 'Optional WhatsApp footer text',
    buttons JSON NULL COMMENT 'Array of quick action / call-to-action buttons',
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
