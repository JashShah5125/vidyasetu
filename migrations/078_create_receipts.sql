CREATE TABLE receipts (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE RESTRICT,
    total_amount DECIMAL(10,2) NOT NULL,
    receipt_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT
);
