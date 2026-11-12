-- Migration 124: Add subject selection type and custom subject IDs to student_enrollments
-- Enables students to choose either a predefined bundle or custom individual subjects

ALTER TABLE student_enrollments
ADD COLUMN subject_selection_type ENUM('bundle', 'custom') NOT NULL DEFAULT 'bundle' AFTER bundle_id,
ADD COLUMN custom_subject_ids JSON NULL AFTER subject_selection_type;
