-- 141_build_audit_log_system.sql
-- Add branch_id to audit_logs for branch-level scoping
-- Allow entity_id to be NULL (for global actions or bulk events)
-- Add indexes on created_at and branch_id
-- Grant audit_log.view permission to inst_admin (role 2) and branch_admin (role 3)

-- 1. Ensure permission audit_log.view exists in permissions table
INSERT IGNORE INTO permissions (module, action, code, description)
VALUES ('audit_log', 'view', 'audit_log.view', 'View audit trail');

-- 2. Grant audit_log.view to inst_admin and branch_admin (and saas_admin if missing)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'audit_log.view'
WHERE r.code IN ('saas_admin', 'inst_admin', 'branch_admin');

-- 3. Modify audit_logs table structure
SET @dbname = DATABASE();

-- Add branch_id column if not exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'branch_id'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE audit_logs ADD COLUMN branch_id INT NULL AFTER tenant_id, ADD CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify entity_id to allow NULL
ALTER TABLE audit_logs MODIFY entity_id INT NULL;

-- Add index on created_at if not exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'audit_logs'
      AND INDEX_NAME = 'idx_audit_logs_created_at'
  ) > 0,
  'SELECT 1',
  'CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on branch_id if not exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'audit_logs'
      AND INDEX_NAME = 'idx_audit_logs_branch'
  ) > 0,
  'SELECT 1',
  'CREATE INDEX idx_audit_logs_branch ON audit_logs(branch_id)'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
