-- Migration 135: Extend assignment_submissions and exam_marks for multi-table assessments

ALTER TABLE `assignment_submissions` ADD COLUMN `student_id` INT NULL AFTER `enrollment_id`;
ALTER TABLE `assignment_submissions` ADD COLUMN `response_text` TEXT NULL AFTER `student_id`;
ALTER TABLE `assignment_submissions` ADD COLUMN `files` JSON NULL AFTER `response_text`;
ALTER TABLE `assignment_submissions` ADD COLUMN `deleted_at` DATETIME NULL AFTER `updated_at`;

ALTER TABLE `exam_marks` ADD COLUMN `student_id` INT NULL AFTER `enrollment_id`;
ALTER TABLE `exam_marks` ADD COLUMN `status` VARCHAR(20) DEFAULT 'graded' AFTER `remarks`;
ALTER TABLE `exam_marks` ADD COLUMN `deleted_at` DATETIME NULL AFTER `updated_at`;
