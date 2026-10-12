-- Migration 144: Seed Doubt & Query Resolution permissions for Student Role (Role ID = 8)

-- 1. Ensure permission records exist in permissions table
INSERT INTO permissions (module, action, code, description, created_at, updated_at)
VALUES 
('student_doubt', 'view', 'student.doubt.view', 'View doubts and query threads in student app', NOW(), NOW()),
('student_doubt', 'create', 'student.doubt.create', 'Create new doubts in student app', NOW(), NOW()),
('student_doubt', 'reply', 'student.doubt.reply', 'Reply in doubt threads in student app', NOW(), NOW()),
('doubt', 'view', 'doubt.view', 'View doubts', NOW(), NOW()),
('doubt', 'create', 'doubt.create', 'Create doubts', NOW(), NOW()),
('doubt', 'reply', 'doubt.reply', 'Reply in doubts', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = NOW();

-- 2. Assign permissions to Student Role (role_id = 8)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 8, p.id, NOW()
FROM permissions p
WHERE p.code IN ('student.doubt.view', 'student.doubt.create', 'student.doubt.reply', 'doubt.view', 'doubt.create', 'doubt.reply')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 8 AND rp.permission_id = p.id
);
