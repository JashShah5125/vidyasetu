-- Final schema: lecture_cancellations
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 052_create_lecture_cancellations.sql
CREATE TABLE lecture_cancellations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    lecture_id INT NOT NULL,
    reason TEXT NOT NULL,
    cancelled_by INT,
    compensatory_lecture_id INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id),
    FOREIGN KEY (compensatory_lecture_id) REFERENCES lectures(id)
);
