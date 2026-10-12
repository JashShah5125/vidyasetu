-- 138_seed_student_app_permissions.sql
-- Seed Student Application Profile and Module permissions for Role ID = 8 (Student)

INSERT IGNORE INTO `permissions` (`module`, `action`, `code`, `description`, `created_at`, `updated_at`)
VALUES 
('app_profile', 'view', 'student.profile.view', 'View own student profile & enrollment info', NOW(), NOW()),
('app_profile', 'update', 'student.profile.update', 'Update allowed personal contact details', NOW(), NOW()),
('app_profile', 'photo', 'student.profile.photo', 'Upload / update profile avatar image', NOW(), NOW()),
('app_profile', 'view', 'student.guardian.view', 'View guardian & emergency contact info', NOW(), NOW()),
('app_profile', 'view', 'student.document.view', 'View uploaded documents & verification status', NOW(), NOW());

-- Map newly added permissions to Role ID = 8 (Student)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 8, p.id
FROM `permissions` p
WHERE p.code IN (
    'student.profile.view',
    'student.profile.update',
    'student.profile.photo',
    'student.guardian.view',
    'student.document.view'
);
