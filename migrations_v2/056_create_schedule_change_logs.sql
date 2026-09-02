-- Final schema: schedule_change_logs
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 053_create_schedule_change_logs.sql
CREATE TABLE schedule_change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    lecture_id INT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);
