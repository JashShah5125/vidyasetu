-- Seed SaaS Admin role assignment in user_roles
-- User ID 1: Super Admin / SaaS Admin
-- Role ID 1: SaaS Admin
-- Tenant ID 1: Master HQ Tenant
-- branch_id: NULL (platform-level cross-tenant access)
INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id) VALUES
(1, 1, NULL, 1);
