-- Seed plan_visibility to make all existing plans visible to 'All'
INSERT IGNORE INTO plan_visibility (plan_id, tenant_id) VALUES
(1, 'All'),
(2, 'All'),
(3, 'All');
