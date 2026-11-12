-- 122: Staff attendance — day-wise + teacher lecture-wise (lecture_ids JSON)
-- Based on 040_create_staff_attendance.sql (live). status becomes TINYINT 0/1/2.

ALTER TABLE staff_attendance
    MODIFY COLUMN status TINYINT NOT NULL DEFAULT 1;

ALTER TABLE staff_attendance
    ADD COLUMN lecture_ids JSON NULL AFTER date;

ALTER TABLE staff_attendance
    ADD COLUMN remarks VARCHAR(255) NULL AFTER status;

ALTER TABLE staff_attendance
    ADD INDEX idx_staff_attendance_date (tenant_id, branch_id, date);