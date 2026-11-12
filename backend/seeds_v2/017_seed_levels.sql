-- Seed for levels table
-- Target tenant: Allen Career Institute (tenant_id = 2)

INSERT IGNORE INTO levels (id, tenant_id, course_id, program_id, name, code, duration, is_active, created_by, updated_by) VALUES
(1, 2, 1, 1, 'Class XI', 'LVL-001', '1 Year', 1, 2, 2),
(2, 2, 1, 1, 'Class XII', 'LVL-002', '1 Year', 1, 2, 2),

(3, 2, 1, 2, 'Class XII (Dropper)', 'LVL-003', '1 Year', 1, 2, 2),

(4, 2, 2, 4, 'Class XII', 'LVL-004', '1 Year', 1, 2, 2),

(5, 2, 2, 5, 'Repeater Batch', 'LVL-005', '1 Year', 1, 2, 2),

(6, 2, 3, 6, 'Class VIII', 'LVL-006', '1 Year', 1, 2, 2),
(7, 2, 3, 6, 'Class IX', 'LVL-007', '1 Year', 1, 2, 2),

(8, 2, 4, 8, 'Class VIII', 'LVL-008', '1 Year', 1, 2, 2),

(9, 2, 4, 9, 'Class VIII', 'LVL-009', '1 Year', 1, 2, 2);
