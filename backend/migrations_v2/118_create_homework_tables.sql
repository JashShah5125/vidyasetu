-- Migration 118: Homework & Homework Submissions
-- Two-table design (single JSON columns instead of junction/file tables).
-- - batch_ids and files store JSON arrays (multi-batch targeting, multiple attachment URLs).
-- - Files themselves are written to backend/uploads/... ; only URLs are persisted.
-- - Soft delete via deleted_at, tenant-scoped, matching app-wide conventions.

CREATE TABLE homeworks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    subject_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'homework',
    batch_ids JSON NOT NULL,
    files JSON,
    due_date DATETIME NOT NULL,
    max_marks DECIMAL(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at DATETIME,
    closed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
CREATE INDEX idx_homeworks_tenant ON homeworks(tenant_id);
CREATE INDEX idx_homeworks_branch ON homeworks(tenant_id, branch_id);
CREATE INDEX idx_homeworks_subject ON homeworks(tenant_id, subject_id);
CREATE INDEX idx_homeworks_status ON homeworks(tenant_id, status);

CREATE TABLE homework_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    homework_id INT NOT NULL,
    student_id INT NOT NULL,
    response_text TEXT,
    files JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    marks_obtained DECIMAL(5,2),
    teacher_feedback TEXT,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    graded_by INT,
    graded_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    UNIQUE(homework_id, student_id),
    FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (graded_by) REFERENCES users(id)
);
CREATE INDEX idx_hw_submissions_tenant ON homework_submissions(tenant_id);
CREATE INDEX idx_hw_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX idx_hw_submissions_student ON homework_submissions(tenant_id, student_id);
CREATE INDEX idx_hw_submissions_status ON homework_submissions(homework_id, status);