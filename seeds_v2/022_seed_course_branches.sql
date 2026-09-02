-- Seed for course_branches table
-- Composite PK (course_id, branch_id). Maps which courses are offered at each
-- branch (see 018_seed_branches.sql and 015_seed_courses.sql).

INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES
-- Mumbai West (branch_id = 1): JEE, NEET, 8th Std
(1, 1),
(2, 1),
(4, 1),

-- Pune Camp (branch_id = 2): Class 10 Foundation, 8th Std
(3, 2),
(4, 2);