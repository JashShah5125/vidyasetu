-- Seed for academic_years (year tenure per branch).
-- Idempotent via UNIQUE(branch_id, name).
-- Allen Career Institute (tenant_id = 2): branch 1 = Mumbai West, branch 2 = Pune Camp.
INSERT IGNORE INTO academic_years (id, tenant_id, branch_id, name, start_date, end_date, status, created_by, updated_by) VALUES
(1, 2, 1, '2025-26', '2025-04-01', '2026-03-31', 'active', 2, 2),
(2, 2, 1, '2026-27', '2026-04-01', '2027-03-31', 'active', 2, 2),
(3, 2, 1, '2027-28', '2027-04-01', '2028-03-31', 'upcoming', 2, 2),
(4, 2, 2, '2025-26', '2025-04-01', '2026-03-31', 'active', 2, 2),
(5, 2, 2, '2026-27', '2026-04-01', '2027-03-31', 'active', 2, 2),
(6, 2, 2, '2027-28', '2027-04-01', '2028-03-31', 'upcoming', 2, 2);