-- Seed for homework/assignment permissions + role grants.

INSERT IGNORE INTO permissions (module, action, code, description) VALUES
('assignment', 'view', 'assignment.view', 'View homework and their submissions'),
('assignment', 'create', 'assignment.create', 'Create homework assignments'),
('assignment', 'update', 'assignment.update', 'Edit / publish / close homework assignments'),
('assignment', 'delete', 'assignment.delete', 'Delete homework assignments'),
('assignment', 'grade', 'assignment.grade', 'Grade homework submissions'),
('assignment', 'submit', 'assignment.submit', 'Submit homework responses');

-- Grant to Institute Admin, Branch Admin, Teacher (SaaS Admin bypasses checks).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.module = 'assignment'
  AND r.code IN ('inst_admin', 'branch_admin', 'teacher');