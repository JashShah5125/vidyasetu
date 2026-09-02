-- Final schema: module_registry
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 005_create_module_registry.sql, 102_modify_module_registry.sql
CREATE TABLE module_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    version VARCHAR(50),
    category VARCHAR(100),
    default_state ENUM('enabled', 'beta', 'deprecated', 'coming_soon', 'hidden') NOT NULL DEFAULT 'enabled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
