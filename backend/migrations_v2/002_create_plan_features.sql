-- Final schema: plan_features
-- Sourced from: 002_create_plan_features.sql
CREATE TABLE plan_features (
    plan_id INT PRIMARY KEY,
    admissions TINYINT(1) NOT NULL DEFAULT 0,
    student_management TINYINT(1) NOT NULL DEFAULT 0,
    parent_portal TINYINT(1) NOT NULL DEFAULT 0,
    teacher_portal TINYINT(1) NOT NULL DEFAULT 0,
    attendance TINYINT(1) NOT NULL DEFAULT 0,
    timetable TINYINT(1) NOT NULL DEFAULT 0,
    assignments TINYINT(1) NOT NULL DEFAULT 0,
    exams TINYINT(1) NOT NULL DEFAULT 0,
    results TINYINT(1) NOT NULL DEFAULT 0,
    doubts TINYINT(1) NOT NULL DEFAULT 0,
    fees TINYINT(1) NOT NULL DEFAULT 0,
    payroll TINYINT(1) NOT NULL DEFAULT 0,
    income TINYINT(1) NOT NULL DEFAULT 0,
    expenses TINYINT(1) NOT NULL DEFAULT 0,
    notifications TINYINT(1) NOT NULL DEFAULT 0,
    sms TINYINT(1) NOT NULL DEFAULT 0,
    whatsapp TINYINT(1) NOT NULL DEFAULT 0,
    email TINYINT(1) NOT NULL DEFAULT 0,
    reports TINYINT(1) NOT NULL DEFAULT 0,
    audit_logs TINYINT(1) NOT NULL DEFAULT 0,
    import_export TINYINT(1) NOT NULL DEFAULT 0,
    api_access TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
