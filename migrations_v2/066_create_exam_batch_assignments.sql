-- Final schema: exam_batch_assignments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 063_create_exam_batch_assignments.sql
CREATE TABLE exam_batch_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    batch_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, batch_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);
