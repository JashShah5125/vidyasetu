-- Seed for user CRUD permissions and mapping to SaaS Admin role (role_id = 1)

INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('user', 'create', 'user.create', 'Create new platform user'),
('user', 'update', 'user.update', 'Update user profile, status, or role'),
('user', 'delete', 'user.delete', 'Soft delete user'),
('user', 'reset_password', 'user.reset_password', 'Reset user password');

-- Map user CRUD permissions to SaaS Admin (role_id = 1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE code LIKE 'user.%';
