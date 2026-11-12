-- Seed for batch permissions + role grants.

-- Insert batch permissions (no id - auto-increment)
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('batch', 'view', 'batch.view', 'View batches and their details'),
('batch', 'create', 'batch.create', 'Create a new batch'),
('batch', 'update', 'batch.update', 'Edit a batch'),
('batch', 'delete', 'batch.delete', 'Soft-delete a batch');

-- Map batch permissions to the Institute Admin role (role_id=2)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE code LIKE 'batch.%';

-- Map batch permissions to the SaaS Admin role (role_id=1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE code LIKE 'batch.%';