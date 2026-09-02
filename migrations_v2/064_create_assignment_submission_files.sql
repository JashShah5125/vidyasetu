-- Final schema: assignment_submission_files
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 061_create_assignment_submission_files.sql
CREATE TABLE assignment_submission_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    submission_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE
);
