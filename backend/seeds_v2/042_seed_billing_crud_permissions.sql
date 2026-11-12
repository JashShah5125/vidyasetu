-- Insert Billing/Invoice CRUD permissions.
-- Idempotent: INSERT IGNORE so re-running is safe.
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('billing', 'create', 'billing.create', 'Create SaaS invoices'),
('billing', 'update', 'billing.update', 'Edit SaaS invoices'),
('billing', 'delete', 'billing.delete', 'Soft-delete SaaS invoices');

-- Grant billing CRUD permissions to saas_admin (1).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('billing.create', 'billing.update', 'billing.delete')
WHERE r.code IN ('saas_admin');