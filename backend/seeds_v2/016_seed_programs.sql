-- Seed for programs table
-- Target tenant: Allen Career Institute (tenant_id = 2)

INSERT IGNORE INTO programs (id, tenant_id, course_id, name, code, duration, description, is_active, created_by, updated_by) VALUES
(1, 2, 1, '2 Year', 'PRG-001', '2 Years', 'Two year classroom program', 1, 2, 2),
(2, 2, 1, '1 Year', 'PRG-002', '1 Year', 'One year dropper program', 1, 2, 2),
(3, 2, 1, 'Crash Course', 'PRG-003', '3 Months', 'Intensive crash course', 0, 2, 2),

(4, 2, 2, '1 Year', 'PRG-004', '1 Year', 'Regular 1 year batch', 1, 2, 2),
(5, 2, 2, 'Repeater', 'PRG-005', '1 Year', 'Batch for repeaters', 1, 2, 2),

(6, 2, 3, '2 Year', 'PRG-006', '2 Years', 'Foundation 2 year', 1, 2, 2),
(7, 2, 3, '1 Year', 'PRG-007', '1 Year', 'Foundation 1 year', 0, 2, 2),

(8, 2, 4, '8th std ICSE', 'PRG-008', '1 Year', 'ICSE board focus', 1, 2, 2),
(9, 2, 4, '8th std CBSE', 'PRG-009', '1 Year', 'CBSE board focus', 1, 2, 2);
