-- Seed enquiry + admission permissions for the lead pipeline
-- Idempotent: INSERT IGNORE so re-running is safe.

INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('enquiry', 'update', 'enquiry:update', 'Update enquiry details and stage'),
('enquiry', 'assign', 'enquiry:assign', 'Assign/reassign counsellor or branch to an enquiry'),
('enquiry', 'followup', 'enquiry:followup', 'Log a follow-up call on an enquiry'),
('enquiry', 'convert', 'enquiry:convert', 'Convert an enquiry into a student'),
('enquiry', 'lost', 'enquiry:lost', 'Mark an enquiry as lost'),
('admission', 'create', 'admission:create', 'Create an admission record'),
('admission', 'read', 'admission:read', 'View admission records'),
('admission', 'verify_documents', 'admission:verify_documents', 'Verify admission documents'),
('admission', 'batch_allocate', 'admission:batch_allocate', 'Allocate a batch to an admission'),
('admission', 'activate', 'admission:activate', 'Activate a student admission');

-- Grant enquiry + admission permissions to inst_admin (2), branch_admin (3), counsellor (4)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'enquiry:create', 'enquiry:read', 'enquiry:update', 'enquiry:assign',
    'enquiry:followup', 'enquiry:convert', 'enquiry:lost',
    'admission:create', 'admission:read', 'admission:verify_documents',
    'admission:batch_allocate', 'admission:activate'
)
WHERE r.code IN ('inst_admin', 'branch_admin', 'counsellor');