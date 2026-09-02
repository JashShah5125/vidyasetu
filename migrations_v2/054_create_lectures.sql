-- Final schema: lectures
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 051_create_lectures.sql, 110_fix_database_schema_inconsistencies.sql
-- Changes: added lecture_type VARCHAR(50) DEFAULT 'Regular', activity_type VARCHAR(50) DEFAULT 'Lecture'
CREATE TABLE lectures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    batch_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    classroom_id INT,
    recurring_rule_id INT,
    lecture_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT,
    lecture_type VARCHAR(50) DEFAULT 'Regular',
    activity_type VARCHAR(50) DEFAULT 'Lecture',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (teacher_user_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (recurring_rule_id) REFERENCES recurring_schedule_rules(id)
);
CREATE INDEX idx_lectures_batch_date ON lectures(batch_id, lecture_date);
CREATE INDEX idx_lectures_teacher_date ON lectures(teacher_user_id, lecture_date);
