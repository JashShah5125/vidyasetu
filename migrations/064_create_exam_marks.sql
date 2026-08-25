CREATE TABLE exam_marks (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    exam_id VARCHAR(36) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(6,2),
    is_absent TINYINT(1) NOT NULL DEFAULT 0,
    grade VARCHAR(10),
    remarks TEXT,
    is_result_visible TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(exam_id, enrollment_id)
);
