-- Seed for permissions table
-- Merged from 013_seed_system_roles_and_permissions.sql and 02_seed_saas_admin_permissions.sql

-- Insert core permissions (no id - auto-increment)
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('enquiry', 'create', 'enquiry:create', 'Create enquiries'),
('enquiry', 'read', 'enquiry:read', 'View enquiries'),
('attendance', 'lock', 'attendance:lock', 'Lock attendance'),
('fees', 'collect', 'fees:collect', 'Collect fees');

-- Insert SaaS Admin permissions (auto-increment IDs)
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('tenant', 'view', 'tenant.view', 'List and view all tenant records'),
('tenant', 'create', 'tenant.create', 'Onboard new tenant'),
('tenant', 'update', 'tenant.update', 'Edit tenant profile/settings'),
('tenant', 'activate', 'tenant.activate', 'Activate a draft/suspended tenant'),
('tenant', 'suspend', 'tenant.suspend', 'Suspend a tenant access'),
('tenant', 'delete', 'tenant.delete', 'Soft-delete a tenant'),
('plan', 'view', 'plan.view', 'View subscription plans'),
('plan', 'create', 'plan.create', 'Create a new subscription plan'),
('plan', 'update', 'plan.update', 'Modify plan details/pricing'),
('plan', 'delete', 'plan.delete', 'Deactivate a plan'),
('subscription', 'view', 'subscription.view', 'View all tenant subscriptions'),
('subscription', 'assign', 'subscription.assign', 'Assign a plan to a tenant'),
('subscription', 'update', 'subscription.update', 'Change subscription status/dates'),
('subscription', 'cancel', 'subscription.cancel', 'Cancel a tenant subscription'),
('module', 'view', 'module.view', 'View module registry'),
('module', 'update', 'module.update', 'Change module lifecycle state'),
('feature_flag', 'view', 'feature_flag.view', 'View feature flags'),
('feature_flag', 'toggle', 'feature_flag.toggle', 'Enable/disable feature flags globally'),
('approval', 'view', 'approval.view', 'View approval requests'),
('approval', 'process', 'approval.process', 'Approve or reject requests'),
('support', 'view', 'support.view', 'View all support tickets'),
('support', 'create', 'support.create', 'Raise a support ticket'),
('support', 'reply', 'support.reply', 'Reply to a support ticket'),
('support', 'edit', 'support.edit', 'Edit a support ticket subject or description'),
('support', 'resolve', 'support.resolve', 'Mark a ticket as resolved'),
('support', 'delete', 'support.delete', 'Delete a support ticket'),
('communication', 'send', 'communication.send', 'Broadcast communications to tenants'),
('billing', 'view', 'billing.view', 'View invoices and billing data'),
('billing', 'export', 'billing.export', 'Export billing data as CSV'),
('analytics', 'view', 'analytics.view', 'View product analytics'),
('report', 'view', 'report.view', 'View SaaS reports'),
('audit_log', 'view', 'audit_log.view', 'View audit trail'),
('system_config', 'view', 'system_config.view', 'View system configuration'),
('system_config', 'update', 'system_config.update', 'Modify system configuration'),
('role', 'view', 'role.view', 'View roles and permissions matrix'),
('role', 'update', 'role.update', 'Modify role permissions'),
('user', 'view', 'user.view', 'View platform users'),
('user', 'update', 'user.update', 'Update user status/access');

-- Insert Course / Program / Level permissions
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('course', 'view', 'course.view', 'View courses, programs and levels'),
('course', 'create', 'course.create', 'Create a new course'),
('course', 'update', 'course.update', 'Edit a course and its programs/levels'),
('course', 'delete', 'course.delete', 'Soft-delete a course');

-- Insert Branch permissions
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('branch', 'view', 'branch.view', 'View branches and their details'),
('branch', 'create', 'branch.create', 'Create a new branch'),
('branch', 'update', 'branch.update', 'Edit a branch and its settings'),
('branch', 'delete', 'branch.delete', 'Soft-delete a branch');

-- Insert Classroom permissions
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('classroom', 'view', 'classroom.view', 'View classrooms and their details'),
('classroom', 'create', 'classroom.create', 'Create a new classroom'),
('classroom', 'update', 'classroom.update', 'Edit a classroom'),
('classroom', 'delete', 'classroom.delete', 'Soft-delete a classroom');
