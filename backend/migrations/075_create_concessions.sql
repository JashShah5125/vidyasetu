CREATE TABLE concessions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    percentage DECIMAL(5,2),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT
);
