-- 126_alter_teacher_allocations_batch_mapping.sql
-- Alter teacher_allocations table to purely map Teachers to Batches (removing subject_id which is handled by teacher_subjects)
-- and seed batch allocations for faculty.

SET FOREIGN_KEY_CHECKS = 0;

-- Drop subject_id column and outdated constraints from teacher_allocations if they exist
ALTER TABLE teacher_allocations DROP FOREIGN KEY IF EXISTS teacher_allocations_ibfk_5;
ALTER TABLE teacher_allocations DROP INDEX IF EXISTS batch_id;
ALTER TABLE teacher_allocations DROP INDEX IF EXISTS uq_batch_teacher;
ALTER TABLE teacher_allocations DROP INDEX IF EXISTS uq_teacher_batch;

-- Recreate or update table structure cleanly
CREATE TABLE IF NOT EXISTS teacher_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    batch_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    created_by INT DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    UNIQUE KEY uq_teacher_batch (tenant_id, batch_id, teacher_user_id),
    KEY idx_ta_teacher (tenant_id, teacher_user_id),
    KEY idx_ta_batch (tenant_id, batch_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop subject_id column if present from earlier migrations
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'teacher_allocations' 
    AND COLUMN_NAME = 'subject_id');

SET @stmt = IF(@col_exists > 0, 'ALTER TABLE teacher_allocations DROP COLUMN subject_id', 'SELECT 1');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure batch_id is NOT NULL
ALTER TABLE teacher_allocations MODIFY COLUMN batch_id INT NOT NULL;

-- Seed Teacher Batch Allocations (Tenant 2 - Allen Career Institute)
-- Mumbai West (Branch 1, Year 2 & 1)
-- Batches: 1 (JEE XI M), 2 (JEE XII DR), 6 (JEE XI E), 7 (JEE XI 25), 8 (JEE XII M), 9 (JEE XII 25), 10 (JEE DR E), 16 (8th ICSE M), 17 (8th ICSE 25), 18 (8th CBSE M), 19 (8th CBSE 25)
-- Teachers: 202 (Sunita), 204 (Neha), 205 (Priya), 208 (Rohan), 210 (Suresh), 211 (Ramesh), 214 (Sunil), 215 (Rajesh), 217 (Anil), 219 (Deepak), 220 (Manish), 222 (Pankaj), 225 (Amit), 227 (Sneha)

INSERT IGNORE INTO teacher_allocations (tenant_id, branch_id, academic_year_id, batch_id, teacher_user_id) VALUES
-- Batch 1: JEE XI Morning
(2, 1, 2, 1, 202), (2, 1, 2, 1, 204), (2, 1, 2, 1, 205), (2, 1, 2, 1, 208),
-- Batch 2: JEE XII Droppers
(2, 1, 2, 2, 202), (2, 1, 2, 2, 210), (2, 1, 2, 2, 211), (2, 1, 2, 2, 214),
-- Batch 6: JEE XI Evening
(2, 1, 2, 6, 215), (2, 1, 2, 6, 217), (2, 1, 2, 6, 219), (2, 1, 2, 6, 220),
-- Batch 7: JEE XI 2025-26
(2, 1, 1, 7, 202), (2, 1, 1, 7, 204), (2, 1, 1, 7, 222), (2, 1, 1, 7, 225),
-- Batch 8: JEE XII Morning
(2, 1, 2, 8, 205), (2, 1, 2, 8, 208), (2, 1, 2, 8, 210), (2, 1, 2, 8, 227),
-- Batch 9: JEE XII 2025-26
(2, 1, 1, 9, 211), (2, 1, 1, 9, 214), (2, 1, 1, 9, 215), (2, 1, 1, 9, 217),
-- Batch 10: JEE Droppers Evening
(2, 1, 2, 10, 202), (2, 1, 2, 10, 219), (2, 1, 2, 10, 220), (2, 1, 2, 10, 222),
-- Batch 16: 8th ICSE Morning
(2, 1, 2, 16, 225), (2, 1, 2, 16, 227), (2, 1, 2, 16, 204),
-- Batch 17: 8th ICSE 2025-26
(2, 1, 1, 17, 205), (2, 1, 1, 17, 208), (2, 1, 1, 17, 210),
-- Batch 18: 8th CBSE Morning
(2, 1, 2, 18, 211), (2, 1, 2, 18, 214), (2, 1, 2, 18, 215),
-- Batch 19: 8th CBSE 2025-26
(2, 1, 1, 19, 217), (2, 1, 1, 19, 219), (2, 1, 1, 19, 220),

-- Pune Camp (Branch 2, Year 5 & 4)
-- Batches: 3 (NEET XII M), 4 (NEET Repeaters), 5 (Foundation VIII), 11 (NEET XII E), 12 (NEET Repeaters 25), 13 (Foundation VIII E), 14 (Foundation IX M), 15 (Foundation IX 25)
-- Teachers: 203 (Vikram), 206 (Karan), 207 (Anjali), 209 (Pooja), 212 (Rakesh), 213 (Sanjay), 216 (Vinod), 218 (Dinesh), 221 (Sandeep), 223 (Vijay), 224 (Ashok), 226 (Rahul)

-- Batch 3: NEET XII Morning
(2, 2, 5, 3, 203), (2, 2, 5, 3, 206), (2, 2, 5, 3, 207), (2, 2, 5, 3, 209),
-- Batch 4: NEET Repeaters
(2, 2, 5, 4, 212), (2, 2, 5, 4, 213), (2, 2, 5, 4, 216), (2, 2, 5, 4, 218),
-- Batch 5: Foundation VIII
(2, 2, 5, 5, 221), (2, 2, 5, 5, 223), (2, 2, 5, 5, 224), (2, 2, 5, 5, 226),
-- Batch 11: NEET XII Evening
(2, 2, 5, 11, 203), (2, 2, 5, 11, 206), (2, 2, 5, 11, 207), (2, 2, 5, 11, 212),
-- Batch 12: NEET Repeaters 2025-26
(2, 2, 4, 12, 213), (2, 2, 4, 12, 216), (2, 2, 4, 12, 218), (2, 2, 4, 12, 221),
-- Batch 13: Foundation VIII Evening
(2, 2, 5, 13, 223), (2, 2, 5, 13, 224), (2, 2, 5, 13, 226), (2, 2, 5, 13, 209),
-- Batch 14: Foundation IX Morning
(2, 2, 5, 14, 203), (2, 2, 5, 14, 206), (2, 2, 5, 14, 207), (2, 2, 5, 14, 218),
-- Batch 15: Foundation IX 2025-26
(2, 2, 4, 15, 212), (2, 2, 4, 15, 213), (2, 2, 4, 15, 221), (2, 2, 4, 15, 226);

SET FOREIGN_KEY_CHECKS = 1;
