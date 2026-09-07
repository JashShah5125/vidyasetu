-- Migration 122: Add bundle_id to student_enrollments
-- Allows tracking which subject bundle a student is enrolled with (e.g. All Subjects vs Drop Subjects)
ALTER TABLE student_enrollments 
ADD COLUMN bundle_id INT NULL REFERENCES subject_bundles(id) ON DELETE SET NULL AFTER batch_id;

CREATE INDEX idx_enrollments_bundle ON student_enrollments(bundle_id);
