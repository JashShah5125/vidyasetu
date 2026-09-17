-- Final schema: saas_lead_followups
-- All IDs: INT AUTO_INCREMENT
-- Follow-up history for SaaS admin leads.
CREATE TABLE saas_lead_followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    followup_mode VARCHAR(50) NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    notes TEXT,
    next_followup_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    CONSTRAINT fk_saas_lead_followups_lead FOREIGN KEY (lead_id) REFERENCES saas_leads(id) ON DELETE CASCADE,
    CONSTRAINT fk_saas_lead_followups_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_saas_lead_followups_lead ON saas_lead_followups(lead_id);