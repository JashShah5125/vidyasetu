-- Final schema: batches
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 033_create_batches.sql, 110_fix_database_schema_inconsistencies.sql
-- Change: added classroom_id INT
CREATE TABLE batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    level_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    capacity INTEGER,
    current_strength INTEGER NOT NULL DEFAULT 0,
    start_time TIME,
    end_time TIME,
    classroom_id INT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(branch_id, academic_year_id, code),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
);
CREATE INDEX idx_batches_branch ON batches(tenant_id, branch_id);
CREATE INDEX idx_batches_ay ON batches(tenant_id, branch_id, academic_year_id);
CREATE INDEX idx_batches_status ON batches(tenant_id, branch_id, status);
