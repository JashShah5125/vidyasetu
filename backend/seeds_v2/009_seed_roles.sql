-- Seed for roles table
-- Flat RBAC: roles are global, so roles have no tenant scoping.

INSERT IGNORE INTO roles (id, name, code, description, is_system, is_active) VALUES
(1, 'SaaS Admin', 'saas_admin', 'Platform-level super administrator with cross-tenant access', 1, 1),
(2, 'Institute Admin', 'inst_admin', 'Full access to the institute', 1, 1),
(3, 'Branch Admin', 'branch_admin', 'Manages a single branch of the institute', 1, 1),
(4, 'Counsellor', 'counsellor', 'Lead pipeline and enquiry logs', 1, 1),
(5, 'Teacher', 'teacher', 'Schedules and doubt clearance', 1, 1),
(6, 'Finance', 'finance', 'Fee ledger and invoice records', 1, 1),
(7, 'Parent', 'parent', 'Access to student progress and communication', 0, 1),
(8, 'Student', 'student', 'Learner account for classes and study material', 0, 1);