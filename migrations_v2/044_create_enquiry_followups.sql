-- Final schema: enquiry_followups
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 041_create_enquiry_followups.sql
CREATE TABLE enquiry_followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    enquiry_id INT NOT NULL,
    followup_mode VARCHAR(50) NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    next_followup_date DATETIME,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
