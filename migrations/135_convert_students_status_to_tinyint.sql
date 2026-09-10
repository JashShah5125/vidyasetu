-- Migration 135: Convert students.status column to TINYINT (0=inactive, 1=active, 2=deleted)

-- 1. Map existing string statuses
UPDATE students SET status = '2' WHERE deleted_at IS NOT NULL;
UPDATE students SET status = '1' WHERE status = 'active' OR status = '1';
UPDATE students SET status = '0' WHERE status IN ('inactive', 'suspended', 'registration_pending', '0');
UPDATE students SET status = '1' WHERE status NOT IN ('0', '1', '2');

-- 2. Alter column to TINYINT NOT NULL DEFAULT 1
ALTER TABLE students 
MODIFY COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active, 2=deleted';
