-- Migration 145: Seed Fee permissions for Student Role (Role ID = 8)

-- 1. Ensure permission records exist in permissions table
INSERT INTO permissions (module, action, code, description, created_at, updated_at)
VALUES 
('student_fee', 'view', 'student.fee.view', 'View student fee status, invoices, and payment receipts', NOW(), NOW()),
('fee', 'view', 'fee.view', 'View fee structures', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = NOW();

-- 2. Assign permissions to Student Role (role_id = 8)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 8, p.id, NOW()
FROM permissions p
WHERE p.code IN ('student.fee.view', 'fee.view')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 8 AND rp.permission_id = p.id
);
