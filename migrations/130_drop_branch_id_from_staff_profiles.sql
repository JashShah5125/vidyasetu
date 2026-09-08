-- Migration 130: Drop legacy branch_id column and foreign key from staff_profiles, keeping only branch_ids JSON column
-- 1. Ensure all rows have branch_ids populated from branch_id if any were missing
UPDATE `staff_profiles`
  SET `branch_ids` = JSON_ARRAY(`branch_id`)
  WHERE (`branch_ids` IS NULL OR JSON_LENGTH(`branch_ids`) = 0) AND `branch_id` IS NOT NULL;

-- 2. Drop the foreign key constraint on branch_id if exists
SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'staff_profiles' 
    AND COLUMN_NAME = 'branch_id' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_fk_sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE `staff_profiles` DROP FOREIGN KEY `', @fk_name, '`'), 'SELECT 1');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Drop index if exists
SET @index_name = (
  SELECT INDEX_NAME 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'staff_profiles' 
    AND COLUMN_NAME = 'branch_id'
  LIMIT 1
);
SET @drop_idx_sql = IF(@index_name IS NOT NULL, CONCAT('ALTER TABLE `staff_profiles` DROP INDEX `', @index_name, '`'), 'SELECT 1');
PREPARE stmt2 FROM @drop_idx_sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. Drop the branch_id column
ALTER TABLE `staff_profiles`
  DROP COLUMN `branch_id`;
