-- Migration 142: Seed Homework & Assignment permissions for Student Role (Role ID = 8)

-- 1. Ensure permission records exist in permissions table
INSERT INTO permissions (module, action, code, description, created_at, updated_at)
VALUES 
('assignment', 'view', 'assignment.view', 'View homework, assignments, exams, and submissions', NOW(), NOW()),
('assignment', 'submit', 'assignment.submit', 'Submit homework responses and attachments', NOW(), NOW()),
('student_homework', 'view', 'student.homework.view', 'View homework and assignments in student app', NOW(), NOW()),
('student_homework', 'submit', 'student.homework.submit', 'Submit homework responses in student app', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = NOW();

-- 2. Assign permissions to Student Role (role_id = 8)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 8, p.id, NOW()
FROM permissions p
WHERE p.code IN ('assignment.view', 'assignment.submit', 'student.homework.view', 'student.homework.submit')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 8 AND rp.permission_id = p.id
);
