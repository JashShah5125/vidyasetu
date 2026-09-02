-- Sample batches per branch (idempotent via UNIQUE(branch_id, academic_year_id, code)).
-- References seeded levels (017), academic years (029), classrooms (026).
-- Allen Career Institute (tenant_id = 2): branch 1 = Mumbai West, branch 2 = Pune Camp.
INSERT IGNORE INTO batches (
    id, tenant_id, branch_id, academic_year_id, level_id, name, code,
    capacity, current_strength, start_time, end_time, classroom_id, status,
    created_by, updated_by
) VALUES
-- Mumbai West (branch 1) - JEE Prep Course (course 1)
(1, 2, 1, 2, 1, 'JEE XI Morning', 'JEE-XI-M', 60, 45, '07:30:00', '12:30:00', 1, 'active', 2, 2),
(2, 2, 1, 2, 3, 'JEE XII Droppers', 'JEE-XII-DR', 50, 38, '14:00:00', '19:00:00', 2, 'active', 2, 2),
-- Pune Camp (branch 2) - NEET Batch Premium (course 2) + Foundation (course 3)
(3, 2, 2, 5, 4, 'NEET XII Morning', 'NEET-XII-M', 55, 41, '07:30:00', '12:30:00', 3, 'active', 2, 2),
(4, 2, 2, 5, 5, 'NEET Repeaters', 'NEET-REP', 45, 12, '14:00:00', '19:00:00', 4, 'inactive', 2, 2),
(5, 2, 2, 5, 6, 'Foundation VIII', 'FOUND-VIII', 40, 30, '08:00:00', '11:00:00', 3, 'active', 2, 2),
-- Level coverage: at least 2 batches per level (levels 1-9 from seed 017).
-- Mumbai West (branch 1) - JEE Prep Course (course 1, levels 1-3)
(6, 2, 1, 2, 1, 'JEE XI Evening', 'JEE-XI-E', 60, 28, '15:00:00', '20:00:00', 1, 'active', 2, 2),
(7, 2, 1, 1, 1, 'JEE XI 2025-26', 'JEE-XI-25', 58, 44, '07:30:00', '12:30:00', 2, 'active', 2, 2),
(8, 2, 1, 2, 2, 'JEE XII Morning', 'JEE-XII-M', 55, 35, '07:30:00', '12:30:00', 1, 'active', 2, 2),
(9, 2, 1, 1, 2, 'JEE XII 2025-26', 'JEE-XII-25', 52, 40, '14:00:00', '19:00:00', 2, 'active', 2, 2),
(10, 2, 1, 2, 3, 'JEE Droppers Evening', 'JEE-DR-E', 50, 22, '15:00:00', '20:00:00', 2, 'active', 2, 2),
-- Pune Camp (branch 2) - NEET Batch Premium (course 2, levels 4-5)
(11, 2, 2, 5, 4, 'NEET XII Evening', 'NEET-XII-E', 55, 27, '14:00:00', '19:00:00', 3, 'active', 2, 2),
(12, 2, 2, 4, 5, 'NEET Repeaters 2025-26', 'NEET-REP-25', 45, 18, '08:00:00', '13:00:00', 4, 'inactive', 2, 2),
-- Pune Camp (branch 2) - Class 10 Foundation (course 3, levels 6-7)
(13, 2, 2, 5, 6, 'Foundation VIII Evening', 'FND-VIII-E', 40, 15, '16:00:00', '18:30:00', 3, 'active', 2, 2),
(14, 2, 2, 5, 7, 'Foundation IX Morning', 'FND-IX-M', 42, 25, '08:00:00', '11:00:00', 3, 'active', 2, 2),
(15, 2, 2, 4, 7, 'Foundation IX 2025-26', 'FND-IX-25', 42, 20, '16:00:00', '18:30:00', 3, 'active', 2, 2),
-- Mumbai West (branch 1) - 8th Standard (course 4, levels 8-9)
(16, 2, 1, 2, 8, '8th ICSE Morning', '8-ICSE-M', 38, 30, '07:00:00', '10:00:00', 1, 'active', 2, 2),
(17, 2, 1, 1, 8, '8th ICSE 2025-26', '8-ICSE-25', 38, 32, '10:00:00', '13:00:00', 1, 'active', 2, 2),
(18, 2, 1, 2, 9, '8th CBSE Morning', '8-CBSE-M', 40, 28, '07:00:00', '10:00:00', 2, 'active', 2, 2),
(19, 2, 1, 1, 9, '8th CBSE 2025-26', '8-CBSE-25', 40, 26, '10:00:00', '13:00:00', 2, 'active', 2, 2);