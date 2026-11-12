-- 125_create_lectures_timetable_table.sql
-- Create or upgrade lectures table to support unified Default Timetable templates and Calendar Lectures

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS lectures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    batch_id INT NOT NULL,
    
    -- Flag to distinguish Default Recurring Template vs Actual Calendar Lecture
    is_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Master Default Template Slot, 0 = Concrete Calendar Lecture',
    parent_template_id INT DEFAULT NULL COMMENT 'References lectures(id) of the default template rule if generated from template',
    
    -- Date and Timings
    day_of_week TINYINT DEFAULT NULL COMMENT '1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun (Always populated for is_default=1)',
    lecture_date DATE DEFAULT NULL COMMENT 'NULL for is_default=1; Specific calendar date for is_default=0',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Academic & Faculty Allocation
    subject_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    classroom_id INT DEFAULT NULL,
    
    -- Lecture Type & Classification
    lecture_type VARCHAR(50) NOT NULL DEFAULT 'Regular' COMMENT 'Regular, Lab, Doubt Session, Extra, Revision, Test',
    activity_type VARCHAR(50) NOT NULL DEFAULT 'Lecture' COMMENT 'Lecture, Practical, Tutorial, Assessment',
    slot_label VARCHAR(100) DEFAULT NULL COMMENT 'e.g., Period 1, Morning Session, Slot A',
    topic VARCHAR(255) DEFAULT NULL COMMENT 'Topic / syllabus unit planned or delivered',
    
    -- Execution Status & Modification Tracking
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled, in_progress, completed, cancelled, rescheduled',
    is_modified_from_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if altered for this specific date',
    cancellation_reason TEXT DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Auditing & Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    created_by INT DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    
    -- Indexes for high performance querying
    KEY idx_lec_tenant_default (tenant_id, is_default),
    KEY idx_lec_batch_default_day (batch_id, is_default, day_of_week),
    KEY idx_lec_batch_actual_date (batch_id, is_default, lecture_date),
    KEY idx_lec_teacher_actual_date (teacher_user_id, is_default, lecture_date),
    KEY idx_lec_classroom_actual_date (classroom_id, is_default, lecture_date),
    KEY idx_lec_parent_ref (parent_template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
