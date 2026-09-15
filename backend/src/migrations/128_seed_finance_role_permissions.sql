-- Migration: 128_seed_finance_role_permissions.sql
-- Assigns comprehensive finance, fee, and student view permissions to role_id 6 ('finance').

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE code IN (
    'fee.view',
    'fee.create',
    'fee.update',
    'fee.delete',
    'fees:collect',
    'student.view',
    'batch.view',
    'course.view',
    'bundle.view',
    'branch.view',
    'billing.view',
    'billing.create',
    'billing.update',
    'billing.delete',
    'billing.export'
);
