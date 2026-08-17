CREATE TABLE batches (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    academic_year_id VARCHAR(36) NOT NULL REFERENCES academic_years(id),
    level_id VARCHAR(36) NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    capacity INTEGER,
    current_strength INTEGER NOT NULL DEFAULT 0,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(branch_id, academic_year_id, code)
);
CREATE INDEX idx_batches_branch ON batches(tenant_id, branch_id);
CREATE INDEX idx_batches_ay ON batches(tenant_id, branch_id, academic_year_id);
CREATE INDEX idx_batches_status ON batches(tenant_id, branch_id, status);
