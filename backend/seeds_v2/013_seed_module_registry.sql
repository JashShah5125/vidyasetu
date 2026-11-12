-- Seed for module_registry table
-- Sourced from 04_seed_default_modules.sql

-- Seed module_registry with defaults
INSERT IGNORE INTO module_registry (code, name, description, version, category, default_state) VALUES
('core_erp', 'Core ERP', 'Essential ERP features including admissions and student roster.', '1.0.0', 'Core ERP', 'enabled'),
('finance', 'Finance Hub', 'Fee collection, expense tracking, and ledgers.', '1.0.0', 'Finance', 'enabled'),
('academics', 'Academics Management', 'Course, subject, batch, and classroom setup.', '1.0.0', 'Academics', 'enabled'),
('classroom', 'Classroom Operations', 'Attendance, homework, assignments, and exams.', '1.0.0', 'Academics', 'enabled'),
('analytics', 'Analytics & Reports', 'Performance reports and branch auditing.', '1.0.0', 'Reporting', 'beta'),
('communication', 'Communication', 'Broadcasts, notifications, and student chats.', '1.0.0', 'Communication', 'enabled'),
('hr', 'HR & Payroll', 'Staff directory, scopes, and payroll management.', '1.0.0', 'HR', 'coming_soon'),
('lms', 'LMS', 'Learning Management System integration and online content.', '1.0.0', 'Learning', 'hidden');
