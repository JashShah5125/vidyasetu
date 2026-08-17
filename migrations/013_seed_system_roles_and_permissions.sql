-- Insert core permissions
INSERT INTO permissions (id, module, action, code, description) VALUES
(UUID(), 'enquiry', 'create', 'enquiry:create', 'Create enquiries'),
(UUID(), 'enquiry', 'read', 'enquiry:read', 'View enquiries'),
(UUID(), 'attendance', 'lock', 'attendance:lock', 'Lock attendance'),
(UUID(), 'fees', 'collect', 'fees:collect', 'Collect fees');
-- Other seeds will be added during implementation.
