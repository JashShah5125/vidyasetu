-- Sample classrooms per branch (idempotent via UNIQUE(branch_id, name)).
INSERT IGNORE INTO classrooms (tenant_id, branch_id, name, room_number, capacity, type, status, created_by, updated_by) VALUES
-- Mumbai West (branch 1, tenant 2)
(2, 1, 'Room 101', '101', 60, 'classroom', 'active', 2, 2),
(2, 1, 'Physics Lab', 'L-01', 30, 'lab', 'active', 2, 2),
-- Pune Camp (branch 2, tenant 2)
(2, 2, 'Room 201', '201', 55, 'classroom', 'active', 2, 2),
(2, 2, 'Chemistry Lab', 'L-02', 35, 'lab', 'active', 2, 2),
-- Aakash Dwarka (branch 3, tenant 3)
(3, 3, 'Room 301', '301', 50, 'classroom', 'active', 3, 3),
(3, 3, 'Computer Lab', 'L-03', 40, 'computer_lab', 'active', 3, 3);