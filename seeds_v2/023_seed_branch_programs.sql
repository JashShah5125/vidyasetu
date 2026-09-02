-- Seed for branch_programs table
-- Ordered per-branch selection of which programs (of a course) are offered,
-- matching the "Courses & Programs" tab of the branch form. Program ids below
-- reference 016_seed_programs.sql.

INSERT IGNORE INTO branch_programs (id, tenant_id, branch_id, course_id, program_id) VALUES
-- Mumbai West (branch_id = 1, tenant_id = 2)
--   JEE Prep Course (course 1): 2 Year (1), 1 Year (2)
(1, 2, 1, 1, 1),
(2, 2, 1, 1, 2),
--   NEET Batch Premium (course 2): 1 Year (4), Repeater (5)
(3, 2, 1, 2, 4),
(4, 2, 1, 2, 5),
--   8th Standard (course 4): 8th std ICSE (8), 8th std CBSE (9)
(5, 2, 1, 4, 8),
(6, 2, 1, 4, 9),

-- Pune Camp (branch_id = 2, tenant_id = 2)
--   Class 10 Foundation (course 3): 2 Year (6)
(7, 2, 2, 3, 6),
--   8th Standard (course 4): 8th std ICSE (8)
(8, 2, 2, 4, 8);