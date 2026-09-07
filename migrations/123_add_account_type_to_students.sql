-- Migration 123: Add account_type to students table
-- account_type: 1 = Directly created by Admin (from Student Roster)
--               0 = Created via Admission / Leads conversion process
ALTER TABLE students
ADD COLUMN account_type TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

-- Back-fill existing students as direct admin-created (since they were seeded/admin-added)
UPDATE students SET account_type = 1 WHERE account_type = 0;

CREATE INDEX idx_students_account_type ON students(tenant_id, account_type);
