-- Final schema: attendance_correction_requests
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 057_create_attendance_correction_requests.sql
CREATE TABLE attendance_correction_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    session_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    requested_by INT NOT NULL,
    original_status VARCHAR(20) NOT NULL,
    requested_status VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by INT,
    resolved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
