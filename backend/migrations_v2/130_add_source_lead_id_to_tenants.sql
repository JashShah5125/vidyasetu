-- 130_add_source_lead_id_to_tenants.sql
-- Reverse lookup from tenant back to the SaaS lead that generated it.
ALTER TABLE tenants ADD COLUMN source_lead_id INT NULL;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_source_lead FOREIGN KEY (source_lead_id) REFERENCES saas_leads(id) ON DELETE SET NULL;
CREATE INDEX idx_tenants_source_lead ON tenants(source_lead_id);