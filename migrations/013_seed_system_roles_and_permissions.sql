-- Insert core permissions (no id - auto-increment)
INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('enquiry', 'create', 'enquiry:create', 'Create enquiries'),
('enquiry', 'read', 'enquiry:read', 'View enquiries'),
('attendance', 'lock', 'attendance:lock', 'Lock attendance'),
('fees', 'collect', 'fees:collect', 'Collect fees');
-- Other seeds will be added during implementation.
