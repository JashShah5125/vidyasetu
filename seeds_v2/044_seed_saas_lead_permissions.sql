-- 044_seed_saas_lead_permissions.sql
-- Seed SaaS Admin lead management permissions and map them to the SaaS Admin role.

INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('lead', 'view', 'lead.view', 'List and view SaaS admin leads'),
('lead', 'create', 'lead.create', 'Create a new SaaS admin lead'),
('lead', 'update', 'lead.update', 'Edit a SaaS admin lead or its status'),
('lead', 'delete', 'lead.delete', 'Soft-delete a SaaS admin lead'),
('lead_followup', 'add', 'lead_followup.add', 'Add a follow-up note to a SaaS admin lead');

-- Map all lead permissions to the SaaS Admin role (role_id=1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE code IN ('lead.view', 'lead.create', 'lead.update', 'lead.delete', 'lead_followup.add');