CREATE TABLE recurring_schedule_rules (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    academic_year_id VARCHAR(36) NOT NULL REFERENCES academic_years(id),
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id VARCHAR(36) NOT NULL REFERENCES subjects(id),
    teacher_user_id INT NOT NULL REFERENCES users(id),
    classroom_id VARCHAR(36) REFERENCES classrooms(id),
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
