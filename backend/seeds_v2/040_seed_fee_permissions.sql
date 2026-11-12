-- Insert Fee Structure permissions.
-- Idempotent: INSERT IGNORE so re-running is safe.
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('fee', 'view', 'fee.view', 'View fee structures (program, bundle, subject fees)'),
('fee', 'create', 'fee.create', 'Create fee structure entries'),
('fee', 'update', 'fee.update', 'Edit fee structure entries'),
('fee', 'delete', 'fee.delete', 'Soft-delete fee structure entries');

-- Grant fee structure permissions to inst_admin (2), branch_admin (3) and saas_admin (1).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('fee.view', 'fee.create', 'fee.update', 'fee.delete')
WHERE r.code IN ('saas_admin', 'inst_admin', 'branch_admin');