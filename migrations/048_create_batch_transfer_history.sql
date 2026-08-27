CREATE TABLE batch_transfer_history (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_enrollment_id VARCHAR(36) REFERENCES student_enrollments(id),
    to_enrollment_id VARCHAR(36) NOT NULL REFERENCES student_enrollments(id),
    from_batch_id VARCHAR(36) REFERENCES batches(id),
    to_batch_id VARCHAR(36) NOT NULL REFERENCES batches(id),
    transfer_date DATE NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);
