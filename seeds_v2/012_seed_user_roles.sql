-- Seed for user_roles table
-- Flat RBAC: user 1 (Super Admin) holds the global SaaS Admin role (id=1).

INSERT IGNORE INTO user_roles (user_id, role_id) VALUES
(1, 1),
(2, 2);
