-- Final schema: bundle_subjects
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 074_create_bundle_subjects.sql
CREATE TABLE bundle_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    bundle_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (bundle_id) REFERENCES subject_bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
