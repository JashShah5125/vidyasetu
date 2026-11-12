-- Final schema: student_enrollments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 047_create_student_enrollments.sql
CREATE TABLE student_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    enrolled_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    promoted_from_enrollment_id INT,
    app_access_enabled TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(student_id, batch_id, academic_year_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
    FOREIGN KEY (promoted_from_enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL
);
CREATE INDEX idx_enrollments_branch ON student_enrollments(tenant_id, branch_id);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_batch ON student_enrollments(batch_id, academic_year_id, status);
