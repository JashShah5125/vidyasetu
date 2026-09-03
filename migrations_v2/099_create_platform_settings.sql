-- 099_create_platform_settings.sql
-- Create table for storing platform configuration parameters with soft deletion support

CREATE TABLE IF NOT EXISTS platform_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    key_name VARCHAR(100) NOT NULL,
    value TEXT NULL,
    is_secret TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL COMMENT 'Soft deletion timestamp',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(category, key_name),
    INDEX idx_category (category),
    INDEX idx_key_name (key_name),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
