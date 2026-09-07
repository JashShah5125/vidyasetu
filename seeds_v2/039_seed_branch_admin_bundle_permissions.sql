-- Grant subject-bundle CRUD permissions to the Branch Admin role (role_id=3).
-- Idempotent: INSERT IGNORE + lookup by permission code.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE code IN ('bundle.view', 'bundle.create', 'bundle.update', 'bundle.delete');