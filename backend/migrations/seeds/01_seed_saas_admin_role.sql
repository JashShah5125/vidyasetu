-- Insert the SaaS Admin role (id=1, tenant_id=1 = master HQ)
INSERT IGNORE INTO roles (id, tenant_id, name, code, description, is_system, is_active)
VALUES (1, 1, 'SaaS Admin', 'saas_admin', 'Platform-level super administrator with cross-tenant access', 1, 1);
