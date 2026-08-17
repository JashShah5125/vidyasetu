CREATE TABLE assignment_submissions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    marks_obtained DECIMAL(5,2),
    teacher_feedback TEXT,
    graded_by VARCHAR(36) REFERENCES users(id),
    graded_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, enrollment_id)
);
