-- Migration 127: Add missing profile columns to staff_profiles
ALTER TABLE `staff_profiles`
  ADD COLUMN IF NOT EXISTS `alternate_mobile` VARCHAR(20) DEFAULT NULL AFTER `contact_number`,
  ADD COLUMN IF NOT EXISTS `blood_group` VARCHAR(10) DEFAULT NULL AFTER `dob`,
  ADD COLUMN IF NOT EXISTS `marital_status` VARCHAR(20) DEFAULT NULL AFTER `blood_group`,
  ADD COLUMN IF NOT EXISTS `personal_email` VARCHAR(255) DEFAULT NULL AFTER `pan_number`,
  ADD COLUMN IF NOT EXISTS `reporting_manager` VARCHAR(150) DEFAULT NULL AFTER `employment_status`,
  ADD COLUMN IF NOT EXISTS `experience` VARCHAR(50) DEFAULT NULL AFTER `reporting_manager`,
  ADD COLUMN IF NOT EXISTS `qualification` VARCHAR(255) DEFAULT NULL AFTER `experience`,
  ADD COLUMN IF NOT EXISTS `biometric_mandatory` TINYINT(1) DEFAULT 0 AFTER `max_lectures_per_week`;
