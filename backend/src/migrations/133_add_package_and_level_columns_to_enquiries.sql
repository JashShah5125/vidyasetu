-- Migration: 133_add_package_and_level_columns_to_enquiries.sql
-- Description: Add package_type (tinyint), package_details (json), and interested_level_id (int) to enquiries table

ALTER TABLE `enquiries`
  ADD COLUMN `package_type` TINYINT NULL DEFAULT NULL COMMENT '1: Program Wise, 2: Bundle Wise, 3: Subject Wise' AFTER `interested_program_id`,
  ADD COLUMN `package_details` JSON NULL DEFAULT NULL COMMENT 'JSON storing program_id, bundle_id, or array of subject_ids' AFTER `package_type`,
  ADD COLUMN `interested_level_id` INT NULL DEFAULT NULL COMMENT 'Interested Level ID' AFTER `interested_academic_year_id`,
  ADD CONSTRAINT `fk_enquiries_interested_level` FOREIGN KEY (`interested_level_id`) REFERENCES `levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
