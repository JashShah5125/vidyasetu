CREATE TABLE assignment_submission_files (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    submission_id VARCHAR(36) NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
