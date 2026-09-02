-- Final schema: roles
-- Flat RBAC: roles are global (one definition per code across the platform).
-- Per-tenant/per-role permission differences are handled via overridden_permissions,
-- not by duplicating role rows.
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
-- Roles are identified globally by code
CREATE UNIQUE INDEX idx_roles_code ON roles(code);
