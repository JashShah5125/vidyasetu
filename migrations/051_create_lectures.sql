CREATE TABLE lectures (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    academic_year_id VARCHAR(36) NOT NULL REFERENCES academic_years(id),
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    subject_id VARCHAR(36) NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_user_id INT NOT NULL REFERENCES users(id),
    classroom_id VARCHAR(36) REFERENCES classrooms(id),
    recurring_rule_id VARCHAR(36) REFERENCES recurring_schedule_rules(id),
    lecture_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
CREATE INDEX idx_lectures_batch_date ON lectures(batch_id, lecture_date);
CREATE INDEX idx_lectures_teacher_date ON lectures(teacher_user_id, lecture_date);
