-- Final schema: teacher_allocations
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 036_create_teacher_allocations.sql, 126_alter_teacher_allocations_batch_mapping.sql
-- Maps faculty / teachers to batches (subject mapping is handled via teacher_subjects)
CREATE TABLE teacher_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    batch_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(tenant_id, batch_id, teacher_user_id),
    KEY idx_ta_teacher (tenant_id, teacher_user_id),
    KEY idx_ta_batch (tenant_id, batch_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE
);
