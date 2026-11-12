-- Final schema: exam_marks
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 064_create_exam_marks.sql
CREATE TABLE exam_marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    marks_obtained DECIMAL(6,2),
    is_absent TINYINT(1) NOT NULL DEFAULT 0,
    grade VARCHAR(10),
    remarks TEXT,
    is_result_visible TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    UNIQUE(exam_id, enrollment_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
);
