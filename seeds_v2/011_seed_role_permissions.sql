-- Seed for role_permissions table
-- Sourced from 03_seed_saas_admin_role_permissions.sql

-- Map all permissions to the SaaS Admin role (role_id=1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Map all permissions to the Institute Admin role (role_id=2)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions;
