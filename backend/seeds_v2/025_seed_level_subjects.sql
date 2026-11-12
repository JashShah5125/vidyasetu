-- Seed for level_subjects table
-- Target tenant: Allen Career Institute (tenant_id = 2)

INSERT IGNORE INTO level_subjects (id, tenant_id, level_id, subject_id) VALUES
-- Level 1: Class XI (JEE) -> Physics, Math, Chemistry
(1, 2, 1, 1), (2, 2, 1, 2), (3, 2, 1, 3),
-- Level 2: Class XII (JEE) -> Physics, Math, Chemistry
(4, 2, 2, 1), (5, 2, 2, 2), (6, 2, 2, 3),
-- Level 3: Class XII Dropper (JEE) -> Physics, Math, Chemistry
(7, 2, 3, 1), (8, 2, 3, 2), (9, 2, 3, 3),

-- Level 4: Class XII (NEET) -> Physics, Chemistry, Biology
(10, 2, 4, 1), (11, 2, 4, 3), (12, 2, 4, 4),
-- Level 5: Repeater Batch (NEET) -> Physics, Chemistry, Biology
(13, 2, 5, 1), (14, 2, 5, 3), (15, 2, 5, 4),

-- Level 6: Class VIII (Foundation)
(16, 2, 6, 2), (17, 2, 6, 7), (18, 2, 6, 8), (19, 2, 6, 9), (20, 2, 6, 14),
-- Level 7: Class IX (Foundation)
(21, 2, 7, 2), (22, 2, 7, 7), (23, 2, 7, 8), (24, 2, 7, 9), (25, 2, 7, 14),
-- Level 8: Class VIII (8th Std ICSE)
(26, 2, 8, 2), (27, 2, 8, 7), (28, 2, 8, 8), (29, 2, 8, 9), (30, 2, 8, 10), (31, 2, 8, 11),
-- Level 9: Class VIII (8th Std CBSE)
(32, 2, 9, 2), (33, 2, 9, 7), (34, 2, 9, 8), (35, 2, 9, 9), (36, 2, 9, 10), (37, 2, 9, 11);
