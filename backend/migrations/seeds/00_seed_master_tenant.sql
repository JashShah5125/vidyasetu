-- Insert the Master HQ tenant (id=1 is always the SaaS platform itself)
INSERT IGNORE INTO tenants (id, name, slug, code, status) VALUES
(1, 'Vidyasetu HQ', 'master', 'MASTER', 'active');
