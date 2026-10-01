-- Migration 134: Extend assignments and exams tables for unified multi-batch, attachments and status
ALTER TABLE assignments MODIFY COLUMN batch_id INT NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS batch_ids JSON NULL AFTER batch_id;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS files JSON NULL AFTER batch_ids;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published' AFTER is_submission_allowed;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER name;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS files JSON NULL AFTER description;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS metadata JSON NULL AFTER files;
