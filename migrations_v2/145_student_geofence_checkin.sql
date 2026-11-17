-- Student Geo-Fenced Self Check-In columns
ALTER TABLE lectures
    ADD COLUMN IF NOT EXISTS student_checkin_open TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS student_checkin_code VARCHAR(10) NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_opened_at DATETIME NULL;

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS student_checkin_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_latitude DECIMAL(10, 8) NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_longitude DECIMAL(11, 8) NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_accuracy_meters FLOAT NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_distance_meters FLOAT NULL,
    ADD COLUMN IF NOT EXISTS student_checkin_geofence_status VARCHAR(30) NULL;

