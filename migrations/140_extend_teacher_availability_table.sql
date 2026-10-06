-- Migration 140: Extend teacher_availability table for recurring & date-specific availability
ALTER TABLE teacher_availability MODIFY branch_id INT NULL;
ALTER TABLE teacher_availability MODIFY day_of_week INT NULL;

-- Add specific_date if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teacher_availability' AND COLUMN_NAME = 'specific_date');
SET @query = IF(@col_exists = 0, 'ALTER TABLE teacher_availability ADD COLUMN specific_date DATE NULL AFTER day_of_week', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add reason if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teacher_availability' AND COLUMN_NAME = 'reason');
SET @query = IF(@col_exists = 0, 'ALTER TABLE teacher_availability ADD COLUMN reason VARCHAR(255) NULL AFTER is_available', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
