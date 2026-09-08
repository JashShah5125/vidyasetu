-- 129_simplify_staff_profiles_fields.sql
-- Consolidate address into single field and remove unnecessary fields: blood_group, marital_status, reporting_manager, permanent_address, current_address

-- Add single address column if not exists
ALTER TABLE `staff_profiles`
  ADD COLUMN IF NOT EXISTS `address` TEXT AFTER `personal_email`;

-- Copy existing current_address / permanent_address to address if present
UPDATE `staff_profiles`
  SET `address` = COALESCE(NULLIF(current_address, ''), permanent_address)
  WHERE `address` IS NULL;

-- Drop redundant columns
ALTER TABLE `staff_profiles`
  DROP COLUMN IF EXISTS `blood_group`,
  DROP COLUMN IF EXISTS `marital_status`,
  DROP COLUMN IF EXISTS `reporting_manager`,
  DROP COLUMN IF EXISTS `current_address`,
  DROP COLUMN IF EXISTS `permanent_address`;
