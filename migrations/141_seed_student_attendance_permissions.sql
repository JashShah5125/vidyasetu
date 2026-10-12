-- 141_seed_student_attendance_permissions.sql
-- Seed Student Application Attendance Tracker permissions for Role ID = 8 (Student)

INSERT IGNORE INTO `permissions` (`module`, `action`, `code`, `description`, `created_at`, `updated_at`)
VALUES 
('app_attendance', 'view', 'student.attendance.view', 'View student attendance summary, date-wise history, and subject breakdown', NOW(), NOW());

-- Map newly added permissions to Role ID = 8 (Student)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 8, p.id
FROM `permissions` p
WHERE p.code IN (
    'student.attendance.view'
);
