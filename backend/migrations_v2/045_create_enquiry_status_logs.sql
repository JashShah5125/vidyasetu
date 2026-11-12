-- Final schema: enquiry_status_logs
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 042_create_enquiry_status_logs.sql
CREATE TABLE enquiry_status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    enquiry_id INT NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
