-- Migration 130: Add Finance, Other Income, Expenses & Payroll permissions and assign to roles

-- 1. Insert new permissions into `permissions` table
INSERT INTO permissions (module, action, code, description, created_at, updated_at) VALUES
-- Other Income permissions
('other_income', 'view', 'other_income.view', 'View non-fee other income records, registry, and summaries', NOW(), NOW()),
('other_income', 'create', 'other_income.create', 'Record new other income receipts', NOW(), NOW()),
('other_income', 'update', 'other_income.update', 'Modify existing other income entries', NOW(), NOW()),
('other_income', 'delete', 'other_income.delete', 'Delete or soft-delete other income records', NOW(), NOW()),
('other_income', 'export', 'other_income.export', 'Export other income statement to CSV/Excel', NOW(), NOW()),

-- Finance General permissions
('finance', 'view', 'finance.view', 'View branch finance ledger and financial reports', NOW(), NOW()),
('finance', 'create', 'finance.create', 'Create financial transaction records', NOW(), NOW()),
('finance', 'update', 'finance.update', 'Update financial entries and vouchers', NOW(), NOW()),
('finance', 'delete', 'finance.delete', 'Delete financial entries and vouchers', NOW(), NOW()),
('finance', 'export', 'finance.export', 'Export branch financial statements', NOW(), NOW()),

-- Operational Expenses permissions
('expense', 'view', 'expense.view', 'View branch operational expenses and vouchers', NOW(), NOW()),
('expense', 'create', 'expense.create', 'Record operational expenses (Salaries, Rent, Utilities, Stationery, etc.)', NOW(), NOW()),
('expense', 'update', 'expense.update', 'Update operational expense vouchers', NOW(), NOW()),
('expense', 'delete', 'expense.delete', 'Delete operational expense records', NOW(), NOW()),
('expense', 'export', 'expense.export', 'Export operational expense ledger to CSV/Excel', NOW(), NOW()),

-- Staff Payroll permissions
('payroll', 'view', 'payroll.view', 'View staff salary structures and monthly payroll logs', NOW(), NOW()),
('payroll', 'create', 'payroll.create', 'Create staff salary structures and process monthly payroll', NOW(), NOW()),
('payroll', 'update', 'payroll.update', 'Modify payroll allocations and deductions', NOW(), NOW()),
('payroll', 'delete', 'payroll.delete', 'Delete or cancel monthly payroll records', NOW(), NOW()),
('payroll', 'export', 'payroll.export', 'Export staff payroll statements and pay-slips', NOW(), NOW())

ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  updated_at = NOW();

-- 2. Grant these permissions to Roles: saas_admin (1), inst_admin (2), branch_admin (3), finance (6)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('saas_admin', 'inst_admin', 'branch_admin', 'finance')
  AND p.code IN (
    'other_income.view', 'other_income.create', 'other_income.update', 'other_income.delete', 'other_income.export',
    'finance.view', 'finance.create', 'finance.update', 'finance.delete', 'finance.export',
    'expense.view', 'expense.create', 'expense.update', 'expense.delete', 'expense.export',
    'payroll.view', 'payroll.create', 'payroll.update', 'payroll.delete', 'payroll.export'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
