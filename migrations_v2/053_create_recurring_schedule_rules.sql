-- Final schema: recurring_schedule_rules
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 050_create_recurring_schedule_rules.sql
CREATE TABLE recurring_schedule_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    batch_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    classroom_id INT,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_user_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
);
