-- ==============================================================================
-- Vidyasetu Default Timetable SQL Seed Queries
-- Generated for Allen Career Institute (Tenant ID: 2)
-- Total Batches: 19 (Mumbai West: 11 Batches, Pune Camp: 8 Batches)
-- Schedule: Monday to Saturday (Day 1 to 6), 2 Slots/Day (12 Slots/Week per Batch)
-- Zero Sunday Slots (Day 0), Strict Default Classroom & Teacher Non-Collision
-- ==============================================================================

-- ==============================================================================
-- BATCH 1: "JEE XI Morning" (JEE-XI-M)
-- Branch: Mumbai West (ID: 1) | Level: Class XI (ID: 1)
-- Assigned Default Classroom: Room 101 (101) (Classroom ID: 1)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 1 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 1, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 2, 202, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 1, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 1, 566, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Physics | Teacher: Test Teacher (566)
    (2, 1, 2, 1, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 2, 210, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 1, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 2, 226, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 1, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 3, 209, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 2, 1, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 3, 223, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 2, 1, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 3, 225, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 2, 1, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 3, 566, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 2, 1, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 2, 208, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 2, 1, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 3, 215, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 1, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 2, 202, 1, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 1, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 1, 566, 1, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Physics | Teacher: Test Teacher (566)


-- ==============================================================================
-- BATCH 2: "JEE XII Droppers" (JEE-XII-DR)
-- Branch: Mumbai West (ID: 1) | Level: Class XII (Dropper) (ID: 3)
-- Assigned Default Classroom: Physics Lab (L-01) (Classroom ID: 2)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 2 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 2, 1, NULL, 1, NULL, '14:00:00', '15:25:00', 2, 202, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 2, 1, NULL, 1, NULL, '15:35:00', '17:00:00', 1, 566, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Physics | Teacher: Test Teacher (566)
    (2, 1, 2, 2, 1, NULL, 2, NULL, '14:00:00', '15:25:00', 2, 208, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 2, 2, 1, NULL, 2, NULL, '15:35:00', '17:00:00', 2, 226, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 2, 1, NULL, 3, NULL, '14:00:00', '15:25:00', 3, 209, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 2, 2, 1, NULL, 3, NULL, '15:35:00', '17:00:00', 3, 223, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 2, 2, 1, NULL, 4, NULL, '14:00:00', '15:25:00', 3, 225, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 2, 2, 1, NULL, 4, NULL, '15:35:00', '17:00:00', 3, 566, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 2, 2, 1, NULL, 5, NULL, '14:00:00', '15:25:00', 2, 210, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 2, 1, NULL, 5, NULL, '15:35:00', '17:00:00', 3, 215, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 2, 1, NULL, 6, NULL, '14:00:00', '15:25:00', 2, 202, 2, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 2, 1, NULL, 6, NULL, '15:35:00', '17:00:00', 1, 566, 2, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Physics | Teacher: Test Teacher (566)


-- ==============================================================================
-- BATCH 6: "JEE XI Evening" (JEE-XI-E)
-- Branch: Mumbai West (ID: 1) | Level: Class XI (ID: 1)
-- Assigned Default Classroom: Room 102 (102) (Classroom ID: 56)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 6 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 6, 1, NULL, 1, NULL, '17:15:00', '18:40:00', 2, 202, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 6, 1, NULL, 1, NULL, '18:50:00', '20:15:00', 2, 208, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 2, 6, 1, NULL, 2, NULL, '17:15:00', '18:40:00', 2, 210, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 6, 1, NULL, 2, NULL, '18:50:00', '20:15:00', 2, 226, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 6, 1, NULL, 3, NULL, '17:15:00', '18:40:00', 3, 209, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 2, 6, 1, NULL, 3, NULL, '18:50:00', '20:15:00', 3, 223, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 2, 6, 1, NULL, 4, NULL, '17:15:00', '18:40:00', 3, 225, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 2, 6, 1, NULL, 4, NULL, '18:50:00', '20:15:00', 3, 566, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 2, 6, 1, NULL, 5, NULL, '17:15:00', '18:40:00', 3, 215, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 6, 1, NULL, 5, NULL, '18:50:00', '20:15:00', 1, 566, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Physics | Teacher: Test Teacher (566)
    (2, 1, 2, 6, 1, NULL, 6, NULL, '17:15:00', '18:40:00', 2, 202, 56, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 6, 1, NULL, 6, NULL, '18:50:00', '20:15:00', 2, 208, 56, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Rohan Shah (208)


-- ==============================================================================
-- BATCH 7: "JEE XI 2025-26" (JEE-XI-25)
-- Branch: Mumbai West (ID: 1) | Level: Class XI (ID: 1)
-- Assigned Default Classroom: Room 103 (103) (Classroom ID: 57)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 7 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 1, 7, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 2, 202, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 1, 7, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 1, 566, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Physics | Teacher: Test Teacher (566)
    (2, 1, 1, 7, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 2, 208, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 1, 7, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 2, 210, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 1, 7, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 2, 226, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 1, 7, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 3, 209, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 1, 7, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 3, 223, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 1, 7, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 3, 566, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 1, 7, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 3, 225, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 1, 7, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 3, 215, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 1, 7, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 2, 202, 57, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 1, 7, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 1, 566, 57, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Physics | Teacher: Test Teacher (566)


-- ==============================================================================
-- BATCH 8: "JEE XII Morning" (JEE-XII-M)
-- Branch: Mumbai West (ID: 1) | Level: Class XII (ID: 2)
-- Assigned Default Classroom: Room 104 (104) (Classroom ID: 58)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 8 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 8, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 3, 215, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 8, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 2, 202, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 8, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 2, 202, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 8, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 3, 209, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 2, 8, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 3, 223, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 2, 8, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 3, 225, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 2, 8, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 3, 566, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 2, 8, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 2, 208, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 2, 8, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 2, 210, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 8, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 2, 210, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 8, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 3, 215, 58, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 8, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 2, 202, 58, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)


-- ==============================================================================
-- BATCH 9: "JEE XII 2025-26" (JEE-XII-25)
-- Branch: Mumbai West (ID: 1) | Level: Class XII (ID: 2)
-- Assigned Default Classroom: Room 105 (105) (Classroom ID: 59)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 9 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 1, 9, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 2, 208, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 1, 9, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 2, 208, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 1, 9, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 2, 210, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 1, 9, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 2, 226, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 1, 9, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 3, 209, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 1, 9, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 3, 223, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 1, 9, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 3, 225, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 1, 9, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 3, 215, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 1, 9, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 3, 215, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 1, 9, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 1, 566, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Physics | Teacher: Test Teacher (566)
    (2, 1, 1, 9, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 2, 208, 59, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 1, 9, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 2, 208, 59, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Rohan Shah (208)


-- ==============================================================================
-- BATCH 10: "JEE Droppers Evening" (JEE-DR-E)
-- Branch: Mumbai West (ID: 1) | Level: Class XII (Dropper) (ID: 3)
-- Assigned Default Classroom: Room 106 (106) (Classroom ID: 60)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 10 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 10, 1, NULL, 1, NULL, '17:15:00', '18:40:00', 1, 566, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Physics | Teacher: Test Teacher (566)
    (2, 1, 2, 10, 1, NULL, 1, NULL, '18:50:00', '20:15:00', 2, 210, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 10, 1, NULL, 2, NULL, '17:15:00', '18:40:00', 2, 226, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 10, 1, NULL, 2, NULL, '18:50:00', '20:15:00', 3, 209, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 1, 2, 10, 1, NULL, 3, NULL, '17:15:00', '18:40:00', 3, 223, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Vijay Roy (223)
    (2, 1, 2, 10, 1, NULL, 3, NULL, '18:50:00', '20:15:00', 3, 225, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Amit Sharma (225)
    (2, 1, 2, 10, 1, NULL, 4, NULL, '17:15:00', '18:40:00', 3, 566, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Test Teacher (566)
    (2, 1, 2, 10, 1, NULL, 4, NULL, '18:50:00', '20:15:00', 3, 215, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 1, 2, 10, 1, NULL, 5, NULL, '17:15:00', '18:40:00', 2, 202, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 10, 1, NULL, 5, NULL, '18:50:00', '20:15:00', 2, 202, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 1, 2, 10, 1, NULL, 6, NULL, '17:15:00', '18:40:00', 1, 566, 60, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Physics | Teacher: Test Teacher (566)
    (2, 1, 2, 10, 1, NULL, 6, NULL, '18:50:00', '20:15:00', 2, 210, 60, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Suresh Bhatia (210)


-- ==============================================================================
-- BATCH 16: "8th ICSE Morning" (8-ICSE-M)
-- Branch: Mumbai West (ID: 1) | Level: Class VIII (ID: 8)
-- Assigned Default Classroom: Room 107 (107) (Classroom ID: 61)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 16 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 16, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 2, 208, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 1, 2, 16, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 2, 210, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 16, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 2, 226, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 16, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 7, 221, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 1, 2, 16, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 8, 224, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Social Studies | Teacher: Ashok Sen (224)
    (2, 1, 2, 16, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 9, 213, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Sanjay Pandey (213)
    (2, 1, 2, 16, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 11, 214, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Sunil Yadav (214)
    (2, 1, 2, 16, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 11, 216, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Vinod Reddy (216)
    (2, 1, 2, 16, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 11, 218, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Dinesh Nair (218)
    (2, 1, 2, 16, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 11, 219, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Deepak Pillai (219)
    (2, 1, 2, 16, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 9, 204, 61, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | English | Teacher: Neha Singh (204)
    (2, 1, 2, 16, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 2, 208, 61, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Rohan Shah (208)


-- ==============================================================================
-- BATCH 17: "8th ICSE 2025-26" (8-ICSE-25)
-- Branch: Mumbai West (ID: 1) | Level: Class VIII (ID: 8)
-- Assigned Default Classroom: Room 108 (108) (Classroom ID: 62)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 17 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 1, 17, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 2, 226, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 1, 17, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 2, 226, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 1, 17, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 7, 221, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 1, 1, 17, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 8, 224, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Social Studies | Teacher: Ashok Sen (224)
    (2, 1, 1, 17, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 9, 204, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Neha Singh (204)
    (2, 1, 1, 17, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 9, 213, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Sanjay Pandey (213)
    (2, 1, 1, 17, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 11, 214, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Sunil Yadav (214)
    (2, 1, 1, 17, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 11, 216, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Vinod Reddy (216)
    (2, 1, 1, 17, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 11, 218, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Dinesh Nair (218)
    (2, 1, 1, 17, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 11, 219, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Deepak Pillai (219)
    (2, 1, 1, 17, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 2, 210, 62, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 1, 17, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 2, 210, 62, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Suresh Bhatia (210)


-- ==============================================================================
-- BATCH 18: "8th CBSE Morning" (8-CBSE-M)
-- Branch: Mumbai West (ID: 1) | Level: Class VIII (ID: 9)
-- Assigned Default Classroom: Room 109 (109) (Classroom ID: 63)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 18 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 2, 18, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 2, 210, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 2, 18, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 2, 226, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 2, 18, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 7, 221, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 1, 2, 18, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 8, 224, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Social Studies | Teacher: Ashok Sen (224)
    (2, 1, 2, 18, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 9, 204, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Neha Singh (204)
    (2, 1, 2, 18, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 9, 204, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Neha Singh (204)
    (2, 1, 2, 18, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 9, 213, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | English | Teacher: Sanjay Pandey (213)
    (2, 1, 2, 18, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 11, 218, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Dinesh Nair (218)
    (2, 1, 2, 18, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 11, 219, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Deepak Pillai (219)
    (2, 1, 2, 18, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 11, 214, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Sunil Yadav (214)
    (2, 1, 2, 18, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 11, 214, 63, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Computer Science | Teacher: Sunil Yadav (214)
    (2, 1, 2, 18, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 2, 210, 63, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Suresh Bhatia (210)


-- ==============================================================================
-- BATCH 19: "8th CBSE 2025-26" (8-CBSE-25)
-- Branch: Mumbai West (ID: 1) | Level: Class VIII (ID: 9)
-- Assigned Default Classroom: Room 110 (110) (Classroom ID: 64)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 19 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 1, 1, 19, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 2, 210, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 1, 19, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 2, 210, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 1, 1, 19, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 2, 226, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rahul Verma (226)
    (2, 1, 1, 19, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 7, 221, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 1, 1, 19, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 8, 224, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Social Studies | Teacher: Ashok Sen (224)
    (2, 1, 1, 19, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 9, 204, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Neha Singh (204)
    (2, 1, 1, 19, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 9, 213, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | English | Teacher: Sanjay Pandey (213)
    (2, 1, 1, 19, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 11, 214, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Computer Science | Teacher: Sunil Yadav (214)
    (2, 1, 1, 19, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 11, 216, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Vinod Reddy (216)
    (2, 1, 1, 19, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 11, 218, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Computer Science | Teacher: Dinesh Nair (218)
    (2, 1, 1, 19, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 11, 219, 64, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Computer Science | Teacher: Deepak Pillai (219)
    (2, 1, 1, 19, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 2, 202, 64, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Sunita Sharma (202)


-- ==============================================================================
-- BATCH 3: "NEET XII Morning" (NEET-XII-M)
-- Branch: Pune Camp (ID: 2) | Level: Class XII (ID: 4)
-- Assigned Default Classroom: Room 201 (201) (Classroom ID: 3)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 3 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 3, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 1, 566, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Physics | Teacher: Test Teacher (566)
    (2, 2, 5, 3, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 3, 215, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 5, 3, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 3, 223, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 3, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 3, 225, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 5, 3, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 3, 566, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Test Teacher (566)
    (2, 2, 5, 3, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 4, 220, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Manish Iyer (220)
    (2, 2, 5, 3, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 4, 203, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Biology | Teacher: Vikram Gupta (203)
    (2, 2, 5, 3, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 3, 209, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 5, 3, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 1, 566, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Physics | Teacher: Test Teacher (566)
    (2, 2, 5, 3, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 3, 223, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 3, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 3, 223, 3, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 3, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 3, 225, 3, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Chemistry | Teacher: Amit Sharma (225)


-- ==============================================================================
-- BATCH 4: "NEET Repeaters" (NEET-REP)
-- Branch: Pune Camp (ID: 2) | Level: Repeater Batch (ID: 5)
-- Assigned Default Classroom: Chemistry Lab (L-02) (Classroom ID: 4)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 4 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 4, 1, NULL, 1, NULL, '14:00:00', '15:25:00', 3, 215, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 5, 4, 1, NULL, 1, NULL, '15:35:00', '17:00:00', 3, 223, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 4, 1, NULL, 2, NULL, '14:00:00', '15:25:00', 3, 225, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 5, 4, 1, NULL, 2, NULL, '15:35:00', '17:00:00', 3, 566, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Test Teacher (566)
    (2, 2, 5, 4, 1, NULL, 3, NULL, '14:00:00', '15:25:00', 4, 203, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Vikram Gupta (203)
    (2, 2, 5, 4, 1, NULL, 3, NULL, '15:35:00', '17:00:00', 4, 220, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Manish Iyer (220)
    (2, 2, 5, 4, 1, NULL, 4, NULL, '14:00:00', '15:25:00', 1, 566, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Physics | Teacher: Test Teacher (566)
    (2, 2, 5, 4, 1, NULL, 4, NULL, '15:35:00', '17:00:00', 3, 209, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 5, 4, 1, NULL, 5, NULL, '14:00:00', '15:25:00', 3, 215, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 5, 4, 1, NULL, 5, NULL, '15:35:00', '17:00:00', 3, 223, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 4, 1, NULL, 6, NULL, '14:00:00', '15:25:00', 3, 225, 4, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 5, 4, 1, NULL, 6, NULL, '15:35:00', '17:00:00', 4, 203, 4, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Biology | Teacher: Vikram Gupta (203)


-- ==============================================================================
-- BATCH 5: "Foundation VIII" (FOUND-VIII)
-- Branch: Pune Camp (ID: 2) | Level: Class VIII (ID: 6)
-- Assigned Default Classroom: Room 202 (202) (Classroom ID: 68)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 5 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 5, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 2, 226, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rahul Verma (226)
    (2, 2, 5, 5, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 2, 208, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 5, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 2, 208, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 5, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 2, 210, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 2, 5, 5, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 9, 213, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Sanjay Pandey (213)
    (2, 2, 5, 5, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 14, 207, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 5, 5, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 14, 207, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 5, 5, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 7, 221, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 5, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 8, 224, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 5, 5, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 2, 226, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rahul Verma (226)
    (2, 2, 5, 5, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 2, 208, 68, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 5, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 9, 204, 68, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | English | Teacher: Neha Singh (204)


-- ==============================================================================
-- BATCH 11: "NEET XII Evening" (NEET-XII-E)
-- Branch: Pune Camp (ID: 2) | Level: Class XII (ID: 4)
-- Assigned Default Classroom: Room 203 (203) (Classroom ID: 69)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 11 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 11, 1, NULL, 1, NULL, '17:15:00', '18:40:00', 3, 209, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 5, 11, 1, NULL, 1, NULL, '18:50:00', '20:15:00', 3, 215, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 5, 11, 1, NULL, 2, NULL, '17:15:00', '18:40:00', 3, 223, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 11, 1, NULL, 2, NULL, '18:50:00', '20:15:00', 3, 225, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 5, 11, 1, NULL, 3, NULL, '17:15:00', '18:40:00', 3, 566, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Chemistry | Teacher: Test Teacher (566)
    (2, 2, 5, 11, 1, NULL, 3, NULL, '18:50:00', '20:15:00', 4, 220, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Manish Iyer (220)
    (2, 2, 5, 11, 1, NULL, 4, NULL, '17:15:00', '18:40:00', 4, 203, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Biology | Teacher: Vikram Gupta (203)
    (2, 2, 5, 11, 1, NULL, 4, NULL, '18:50:00', '20:15:00', 3, 209, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 5, 11, 1, NULL, 5, NULL, '17:15:00', '18:40:00', 3, 209, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 5, 11, 1, NULL, 5, NULL, '18:50:00', '20:15:00', 3, 215, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 5, 11, 1, NULL, 6, NULL, '17:15:00', '18:40:00', 3, 223, 69, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 5, 11, 1, NULL, 6, NULL, '18:50:00', '20:15:00', 3, 225, 69, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Chemistry | Teacher: Amit Sharma (225)


-- ==============================================================================
-- BATCH 12: "NEET Repeaters 2025-26" (NEET-REP-25)
-- Branch: Pune Camp (ID: 2) | Level: Repeater Batch (ID: 5)
-- Assigned Default Classroom: Room 204 (204) (Classroom ID: 70)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 12 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 4, 12, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 3, 215, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Rajesh Mishra (215)
    (2, 2, 4, 12, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 3, 223, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 4, 12, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 3, 225, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 4, 12, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 3, 566, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Chemistry | Teacher: Test Teacher (566)
    (2, 2, 4, 12, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 4, 203, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Vikram Gupta (203)
    (2, 2, 4, 12, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 4, 220, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Biology | Teacher: Manish Iyer (220)
    (2, 2, 4, 12, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 1, 566, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Physics | Teacher: Test Teacher (566)
    (2, 2, 4, 12, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 3, 209, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Chemistry | Teacher: Pooja Mehta (209)
    (2, 2, 4, 12, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 3, 223, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 4, 12, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 3, 223, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Chemistry | Teacher: Vijay Roy (223)
    (2, 2, 4, 12, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 3, 225, 70, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Chemistry | Teacher: Amit Sharma (225)
    (2, 2, 4, 12, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 4, 203, 70, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Biology | Teacher: Vikram Gupta (203)


-- ==============================================================================
-- BATCH 13: "Foundation VIII Evening" (FND-VIII-E)
-- Branch: Pune Camp (ID: 2) | Level: Class VIII (ID: 6)
-- Assigned Default Classroom: Room 205 (205) (Classroom ID: 71)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 13 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 13, 1, NULL, 1, NULL, '17:15:00', '18:40:00', 2, 208, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 13, 1, NULL, 1, NULL, '18:50:00', '20:15:00', 7, 221, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 13, 1, NULL, 2, NULL, '17:15:00', '18:40:00', 7, 221, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 13, 1, NULL, 2, NULL, '18:50:00', '20:15:00', 7, 221, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 13, 1, NULL, 3, NULL, '17:15:00', '18:40:00', 9, 204, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Neha Singh (204)
    (2, 2, 5, 13, 1, NULL, 3, NULL, '18:50:00', '20:15:00', 9, 213, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | English | Teacher: Sanjay Pandey (213)
    (2, 2, 5, 13, 1, NULL, 4, NULL, '17:15:00', '18:40:00', 14, 207, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 5, 13, 1, NULL, 4, NULL, '18:50:00', '20:15:00', 8, 224, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 5, 13, 1, NULL, 5, NULL, '17:15:00', '18:40:00', 2, 226, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rahul Verma (226)
    (2, 2, 5, 13, 1, NULL, 5, NULL, '18:50:00', '20:15:00', 2, 208, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 13, 1, NULL, 6, NULL, '17:15:00', '18:40:00', 2, 208, 71, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 13, 1, NULL, 6, NULL, '18:50:00', '20:15:00', 7, 221, 71, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Science | Teacher: Sandeep Menon (221)


-- ==============================================================================
-- BATCH 14: "Foundation IX Morning" (FND-IX-M)
-- Branch: Pune Camp (ID: 2) | Level: Class IX (ID: 7)
-- Assigned Default Classroom: Room 206 (206) (Classroom ID: 72)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 14 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 5, 14, 1, NULL, 1, NULL, '07:00:00', '08:25:00', 7, 221, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 14, 1, NULL, 1, NULL, '08:35:00', '10:00:00', 7, 221, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 5, 14, 1, NULL, 2, NULL, '07:00:00', '08:25:00', 8, 224, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 5, 14, 1, NULL, 2, NULL, '08:35:00', '10:00:00', 9, 204, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | English | Teacher: Neha Singh (204)
    (2, 2, 5, 14, 1, NULL, 3, NULL, '07:00:00', '08:25:00', 14, 207, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 5, 14, 1, NULL, 3, NULL, '08:35:00', '10:00:00', 2, 202, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 2, 5, 14, 1, NULL, 4, NULL, '07:00:00', '08:25:00', 2, 202, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 2, 5, 14, 1, NULL, 4, NULL, '08:35:00', '10:00:00', 14, 207, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 5, 14, 1, NULL, 5, NULL, '07:00:00', '08:25:00', 2, 202, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 2, 5, 14, 1, NULL, 5, NULL, '08:35:00', '10:00:00', 2, 208, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rohan Shah (208)
    (2, 2, 5, 14, 1, NULL, 6, NULL, '07:00:00', '08:25:00', 2, 210, 72, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Mathematics | Teacher: Suresh Bhatia (210)
    (2, 2, 5, 14, 1, NULL, 6, NULL, '08:35:00', '10:00:00', 2, 226, 72, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Mathematics | Teacher: Rahul Verma (226)


-- ==============================================================================
-- BATCH 15: "Foundation IX 2025-26" (FND-IX-25)
-- Branch: Pune Camp (ID: 2) | Level: Class IX (ID: 7)
-- Assigned Default Classroom: Room 207 (207) (Classroom ID: 73)
-- Slot Schedule: Monday to Saturday (12 Slots/Week)
-- ==============================================================================
DELETE FROM lectures WHERE tenant_id = 2 AND batch_id = 15 AND is_default = 1;

INSERT INTO lectures (
    tenant_id, branch_id, academic_year_id, batch_id,
    is_default, parent_template_id, day_of_week, lecture_date,
    start_time, end_time, subject_id, teacher_user_id, classroom_id,
    lecture_type, activity_type, slot_label, status, is_active,
    created_at, updated_at
) VALUES 
    (2, 2, 4, 15, 1, NULL, 1, NULL, '10:15:00', '11:40:00', 8, 224, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 4, 15, 1, NULL, 1, NULL, '11:50:00', '13:15:00', 2, 202, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 1 | Mathematics | Teacher: Sunita Sharma (202)
    (2, 2, 4, 15, 1, NULL, 2, NULL, '10:15:00', '11:40:00', 8, 224, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 2 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 4, 15, 1, NULL, 2, NULL, '11:50:00', '13:15:00', 9, 204, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 2 | English | Teacher: Neha Singh (204)
    (2, 2, 4, 15, 1, NULL, 3, NULL, '10:15:00', '11:40:00', 14, 207, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 4, 15, 1, NULL, 3, NULL, '11:50:00', '13:15:00', 14, 207, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 3 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 4, 15, 1, NULL, 4, NULL, '10:15:00', '11:40:00', 14, 207, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 4 | Aptitude & Reasoning | Teacher: Anjali Desai (207)
    (2, 2, 4, 15, 1, NULL, 4, NULL, '11:50:00', '13:15:00', 9, 213, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 4 | English | Teacher: Sanjay Pandey (213)
    (2, 2, 4, 15, 1, NULL, 5, NULL, '10:15:00', '11:40:00', 7, 221, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Science | Teacher: Sandeep Menon (221)
    (2, 2, 4, 15, 1, NULL, 5, NULL, '11:50:00', '13:15:00', 2, 226, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()), -- Day 5 | Mathematics | Teacher: Rahul Verma (226)
    (2, 2, 4, 15, 1, NULL, 6, NULL, '10:15:00', '11:40:00', 8, 224, 73, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 1, NOW(), NOW()), -- Day 6 | Social Studies | Teacher: Ashok Sen (224)
    (2, 2, 4, 15, 1, NULL, 6, NULL, '11:50:00', '13:15:00', 8, 224, 73, 'Regular', 'Lecture', 'Slot 2', 'scheduled', 1, NOW(), NOW()); -- Day 6 | Social Studies | Teacher: Ashok Sen (224)

