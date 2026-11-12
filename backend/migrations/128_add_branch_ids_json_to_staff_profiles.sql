-- Migration 128: Add branch_ids JSON column to staff_profiles for multi-branch mapping
ALTER TABLE `staff_profiles`
  ADD COLUMN IF NOT EXISTS `branch_ids` JSON DEFAULT NULL AFTER `branch_id`;

-- Backfill existing staff profiles with their single branch_id as a JSON array
UPDATE `staff_profiles`
  SET `branch_ids` = JSON_ARRAY(`branch_id`)
  WHERE `branch_ids` IS NULL AND `branch_id` IS NOT NULL;
