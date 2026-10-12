-- 139_seed_student_academic_permissions.sql
-- Seed Student Application Academic Module permissions for Role ID = 8 (Student)

INSERT IGNORE INTO `permissions` (`module`, `action`, `code`, `description`, `created_at`, `updated_at`)
VALUES 
('app_academic', 'view', 'student.enrollment.view', 'View own active academic enrollment and batch details', NOW(), NOW()),
('app_academic', 'view', 'student.subject.view', 'View enrolled subjects and curriculum details', NOW(), NOW()),
('app_academic', 'view', 'student.faculty.view', 'View assigned teachers and faculty for enrolled batch', NOW(), NOW());

-- Map newly added permissions to Role ID = 8 (Student)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 8, p.id
FROM `permissions` p
WHERE p.code IN (
    'student.enrollment.view',
    'student.subject.view',
    'student.faculty.view'
);
