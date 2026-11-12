-- Final schema: assignment_files
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 059_create_assignment_files.sql
CREATE TABLE assignment_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    assignment_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);
