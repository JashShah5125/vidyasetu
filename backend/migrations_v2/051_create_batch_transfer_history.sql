-- Final schema: batch_transfer_history
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 048_create_batch_transfer_history.sql
CREATE TABLE batch_transfer_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    student_id INT NOT NULL,
    from_enrollment_id INT,
    to_enrollment_id INT NOT NULL,
    from_batch_id INT,
    to_batch_id INT NOT NULL,
    transfer_date DATE NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (from_enrollment_id) REFERENCES student_enrollments(id),
    FOREIGN KEY (to_enrollment_id) REFERENCES student_enrollments(id),
    FOREIGN KEY (from_batch_id) REFERENCES batches(id),
    FOREIGN KEY (to_batch_id) REFERENCES batches(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
