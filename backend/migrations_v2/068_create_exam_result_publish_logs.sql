-- Final schema: exam_result_publish_logs
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 065_create_exam_result_publish_logs.sql
CREATE TABLE exam_result_publish_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    exam_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    published_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (published_by) REFERENCES users(id)
);
