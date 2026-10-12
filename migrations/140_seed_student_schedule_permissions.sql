-- 140_seed_student_schedule_permissions.sql
-- Seed Student Application Schedule / Timetable permissions for Role ID = 8 (Student)

INSERT IGNORE INTO `permissions` (`module`, `action`, `code`, `description`, `created_at`, `updated_at`)
VALUES 
('app_schedule', 'view', 'student.schedule.view', 'View student daily and calendar timetable schedule', NOW(), NOW()),
('app_schedule', 'view', 'student.lecture.view', 'View detailed information for a specific lecture session', NOW(), NOW());

-- Map newly added permissions to Role ID = 8 (Student)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 8, p.id
FROM `permissions` p
WHERE p.code IN (
    'student.schedule.view',
    'student.lecture.view'
);
