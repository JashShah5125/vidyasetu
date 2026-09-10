-- Seed correct permissions for Branch Admin (role_id = 3)
-- Branch Admin has course.view, bundle.view, branch.view, branch.update, classroom.*, batch.*

-- 1. Ensure branch_admin role has course.view, bundle.view, branch.view, branch.update
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE code IN (
    'course.view',
    'bundle.view',
    'branch.view',
    'branch.update',
    'classroom.view',
    'classroom.create',
    'classroom.update',
    'classroom.delete',
    'batch.view',
    'batch.create',
    'batch.update',
    'batch.delete'
);

-- 2. Ensure branch_admin DOES NOT have course create/update/delete or branch create/delete
DELETE FROM role_permissions
WHERE role_id = 3 AND permission_id IN (
    SELECT id FROM permissions
    WHERE code IN (
        'course.create',
        'course.update',
        'course.delete',
        'branch.create',
        'branch.delete',
        'bundle.create',
        'bundle.update',
        'bundle.delete'
    )
);
