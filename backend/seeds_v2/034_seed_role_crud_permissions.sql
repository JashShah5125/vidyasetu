-- Seed for role CRUD permissions and mapping to SaaS Admin role (role_id = 1)

INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('role', 'create', 'role.create', 'Create custom global role'),
('role', 'delete', 'role.delete', 'Delete custom global role');

-- Map all role CRUD permissions to SaaS Admin (role_id = 1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE code LIKE 'role.%';
