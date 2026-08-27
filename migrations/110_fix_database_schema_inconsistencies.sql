SET FOREIGN_KEY_CHECKS = 0;

-- 1. `users` Table
ALTER TABLE `users` MODIFY `id` VARCHAR(36) NOT NULL;
ALTER TABLE `users` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`);
ALTER TABLE `users` MODIFY `tenant_id` VARCHAR(36) NOT NULL;
ALTER TABLE `users` MODIFY `created_by` VARCHAR(36) DEFAULT NULL;
ALTER TABLE `users` MODIFY `updated_by` VARCHAR(36) DEFAULT NULL;

-- 2. `staff_profiles` Table
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

-- 3. `courses` & `course_branches` Table
ALTER TABLE `courses`
  CHANGE COLUMN `duration_months` `duration` VARCHAR(50) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `course_branches` (
  `course_id` VARCHAR(36) NOT NULL,
  `branch_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`course_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. `levels`
ALTER TABLE `levels`
  ADD COLUMN `duration` VARCHAR(50) DEFAULT NULL AFTER `code`;

-- 5. `batches` & `classrooms`
ALTER TABLE `batches`
  ADD COLUMN `classroom_id` VARCHAR(36) DEFAULT NULL AFTER `end_time`;

ALTER TABLE `classrooms`
  ADD COLUMN `room_number` VARCHAR(50) DEFAULT NULL AFTER `name`;

-- 6. `teacher_allocations`
ALTER TABLE `teacher_allocations`
  MODIFY `batch_id` VARCHAR(36) NULL;

-- 7. `lectures`
ALTER TABLE `lectures`
  ADD COLUMN `lecture_type` VARCHAR(50) DEFAULT 'Regular' AFTER `topic`,
  ADD COLUMN `activity_type` VARCHAR(50) DEFAULT 'Lecture' AFTER `lecture_type`;

-- 8. `fee_plans`
ALTER TABLE `fee_plans`
  ADD COLUMN `down_payment` DECIMAL(10,2) DEFAULT NULL AFTER `total_amount`,
  ADD COLUMN `months` INT DEFAULT NULL AFTER `down_payment`,
  ADD COLUMN `installment_amount` DECIMAL(10,2) DEFAULT NULL AFTER `months`;

-- 9. `students`
ALTER TABLE `students`
  ADD COLUMN `full_name` VARCHAR(255) NOT NULL AFTER `student_code`,
  DROP COLUMN `first_name`,
  DROP COLUMN `last_name`;

SET FOREIGN_KEY_CHECKS = 1;
