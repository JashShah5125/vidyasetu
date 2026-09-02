-- Seed for branch_settings table
-- Branch-level key/value configuration. The branch module reads two keys:
--   - alt_emails    : array of alternate admin notification email addresses
--   - default_email : the email notifications are sent to by default
-- Values are stored as JSON in the setting_value column.

INSERT IGNORE INTO branch_settings (id, tenant_id, branch_id, setting_key, setting_value) VALUES
-- Mumbai West (branch_id = 1, tenant_id = 2)
(1, 2, 1, 'alt_emails', '["seema.alt@apexiit.com", "support.mumbai@apexiit.com"]'),
(2, 2, 1, 'default_email', '"seema@apexiit.com"'),

-- Pune Camp (branch_id = 2, tenant_id = 2)
(3, 2, 2, 'alt_emails', '["ramesh.alt@apexiit.com"]'),
(4, 2, 2, 'default_email', '"ramesh@apexiit.com"'),

-- Aakash Dwarka (branch_id = 3, tenant_id = 3)
(5, 3, 3, 'alt_emails', '["centerhead.alt@aakash.ac.in", "dwarka.support@aakash.ac.in"]'),
(6, 3, 3, 'default_email', '"centerhead@aakash.ac.in"');