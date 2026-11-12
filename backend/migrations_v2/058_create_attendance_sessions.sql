-- Final schema: attendance_sessions
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 055_create_attendance_sessions.sql
CREATE TABLE attendance_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    lecture_id INT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME,
    submitted_by INT,
    locked_at DATETIME,
    locked_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE RESTRICT,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (locked_by) REFERENCES users(id)
);
