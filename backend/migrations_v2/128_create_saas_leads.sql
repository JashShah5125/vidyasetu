-- Final schema: saas_leads
-- All IDs: INT AUTO_INCREMENT
-- Platform-level lead table for the SaaS admin console (belongs to master tenant, no tenant_id).
-- A lead represents a prospective institute owner/admin that can be converted into a tenant record.
CREATE TABLE saas_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    designation VARCHAR(50),
    email VARCHAR(255),
    mobile VARCHAR(20) NOT NULL,
    alt_mobile VARCHAR(20),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    -- 1 = manual (SaaS admin), 2 = landing_page (public form, reserved)
    source TINYINT NOT NULL DEFAULT 1,
    assigned_to INT,
    -- 1 = new, 2 = contacted, 3 = follow_up, 4 = plan_assigned, 5 = interested, 6 = converted, 7 = lost
    status TINYINT NOT NULL DEFAULT 1,
    lost_reason TEXT,
    plan_assigned_at DATETIME,
    next_followup_at DATETIME,
    plan_id INT,
    preferred_slug VARCHAR(100),
    remarks TEXT,
    converted_tenant_id INT,
    converted_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    CONSTRAINT fk_saas_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_saas_leads_plan_id FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    CONSTRAINT fk_saas_leads_converted_tenant FOREIGN KEY (converted_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    UNIQUE KEY uq_saas_leads_converted_tenant (converted_tenant_id)
);
CREATE INDEX idx_saas_leads_status ON saas_leads(status);
CREATE INDEX idx_saas_leads_assigned_to ON saas_leads(assigned_to);
CREATE INDEX idx_saas_leads_source ON saas_leads(source);
CREATE INDEX idx_saas_leads_created_at ON saas_leads(created_at);
CREATE INDEX idx_saas_leads_mobile ON saas_leads(mobile);
CREATE INDEX idx_saas_leads_email ON saas_leads(email);
CREATE INDEX idx_saas_leads_deleted_status ON saas_leads(deleted_at, status);