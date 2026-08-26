CREATE TABLE student_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    academic_year_id VARCHAR(36) NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    enrolled_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    promoted_from_enrollment_id VARCHAR(36) REFERENCES student_enrollments(id) ON DELETE SET NULL,
    app_access_enabled TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(student_id, batch_id, academic_year_id)
);
CREATE INDEX idx_enrollments_branch ON student_enrollments(tenant_id, branch_id);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_batch ON student_enrollments(batch_id, academic_year_id, status);
