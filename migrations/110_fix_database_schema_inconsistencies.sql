SET FOREIGN_KEY_CHECKS = 0;

-- NOTE: Migration 121 handles converting all VARCHAR(36) IDs to INT AUTO_INCREMENT.
-- The original users/tenants ID type changes have been removed — those tables
-- already use INT AUTO_INCREMENT and should stay that way.

-- 1. `staff_profiles` Table
ALTER TABLE `staff_profiles`
  ADD COLUMN `contact_number` VARCHAR(20) DEFAULT NULL AFTER `employee_id`,
  ADD COLUMN `emergency_contact_name` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `emergency_contact_number` VARCHAR(20) DEFAULT NULL,
  ADD COLUMN `current_address` TEXT DEFAULT NULL,
  ADD COLUMN `permanent_address` TEXT DEFAULT NULL,
  ADD COLUMN `city` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `state` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `pincode` VARCHAR(20) DEFAULT NULL,
  ADD COLUMN `salary_type` VARCHAR(20) DEFAULT NULL AFTER `employment_status`,
  CHANGE COLUMN `monthly_salary` `salary_amount` DECIMAL(12,2) DEFAULT NULL,
  ADD COLUMN `pf_account_number` VARCHAR(100) DEFAULT NULL AFTER `pf_applicable`,
  ADD COLUMN `esic_account_number` VARCHAR(100) DEFAULT NULL AFTER `esic_applicable`;

-- 2. `courses` & `course_branches` Table
ALTER TABLE `courses`
  CHANGE COLUMN `duration_months` `duration` VARCHAR(50) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `course_branches` (
  `course_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  PRIMARY KEY (`course_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. `levels`
ALTER TABLE `levels`
  ADD COLUMN `duration` VARCHAR(50) DEFAULT NULL AFTER `code`;

-- 4. `batches` & `classrooms`
ALTER TABLE `batches`
  ADD COLUMN `classroom_id` INT DEFAULT NULL AFTER `end_time`;

ALTER TABLE `classrooms`
  ADD COLUMN `room_number` VARCHAR(50) DEFAULT NULL AFTER `name`;

-- 5. `teacher_allocations`
ALTER TABLE `teacher_allocations`
  MODIFY `batch_id` INT NULL;

-- 6. `lectures`
ALTER TABLE `lectures`
  ADD COLUMN `lecture_type` VARCHAR(50) DEFAULT 'Regular' AFTER `topic`,
  ADD COLUMN `activity_type` VARCHAR(50) DEFAULT 'Lecture' AFTER `lecture_type`;

-- 7. `fee_plans`
ALTER TABLE `fee_plans`
  ADD COLUMN `down_payment` DECIMAL(10,2) DEFAULT NULL AFTER `total_amount`,
  ADD COLUMN `months` INT DEFAULT NULL AFTER `down_payment`,
  ADD COLUMN `installment_amount` DECIMAL(10,2) DEFAULT NULL AFTER `months`;

-- 8. `students`
ALTER TABLE `students`
  ADD COLUMN `full_name` VARCHAR(255) NOT NULL AFTER `student_code`,
  DROP COLUMN `first_name`,
  DROP COLUMN `last_name`;

SET FOREIGN_KEY_CHECKS = 1;
