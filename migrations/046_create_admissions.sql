CREATE TABLE admissions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enquiry_id VARCHAR(36) REFERENCES enquiries(id) ON DELETE SET NULL,
    admission_date DATE NOT NULL,
    admission_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(tenant_id, admission_number)
);
