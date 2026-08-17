CREATE TABLE enquiry_followups (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    enquiry_id VARCHAR(36) NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    followup_mode VARCHAR(50) NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    next_followup_date DATETIME,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36) REFERENCES users(id)
);
