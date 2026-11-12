SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE tenants
ADD COLUMN owner_name VARCHAR(255),
ADD COLUMN owner_email VARCHAR(255),
ADD COLUMN owner_mobile VARCHAR(20),
ADD COLUMN address_line1 VARCHAR(255),
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(100),
ADD COLUMN pincode VARCHAR(10),
ADD COLUMN country VARCHAR(100) DEFAULT 'India',
ADD COLUMN gst_number VARCHAR(20),
ADD COLUMN pan_number VARCHAR(15),
ADD COLUMN logo_url TEXT,
ADD COLUMN primary_color VARCHAR(7),
ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
ADD COLUMN website VARCHAR(255),
ADD COLUMN plan_id INT,
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN billing_cycle VARCHAR(10) DEFAULT 'annual',
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN renewal_date DATE,
ADD COLUMN trial_ends_at DATE,
ADD COLUMN subscription_notes TEXT;

ALTER TABLE tenants
ADD CONSTRAINT fk_tenants_plan_id FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;

UPDATE tenants t
JOIN tenant_profiles tp ON t.id = tp.tenant_id
SET 
    t.owner_name = tp.owner_name,
    t.owner_email = tp.owner_email,
    t.owner_mobile = tp.owner_mobile,
    t.address_line1 = tp.address_line1,
    t.city = tp.city,
    t.state = tp.state,
    t.pincode = tp.pincode,
    t.country = tp.country,
    t.gst_number = tp.gst_number,
    t.pan_number = tp.pan_number,
    t.logo_url = tp.logo_url,
    t.primary_color = tp.primary_color,
    t.timezone = tp.timezone,
    t.website = tp.website;

UPDATE tenants t
JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
SET 
    t.plan_id = ts.plan_id,
    t.subscription_status = ts.status,
    t.billing_cycle = ts.billing_cycle,
    t.start_date = ts.start_date,
    t.end_date = ts.end_date,
    t.renewal_date = ts.renewal_date,
    t.trial_ends_at = ts.trial_ends_at,
    t.subscription_notes = ts.notes;

ALTER TABLE saas_invoices DROP FOREIGN KEY saas_invoices_ibfk_2; 
-- Wait, safer to just SET FOREIGN_KEY_CHECKS = 0 which drops tables even if referenced, 
-- but saas_invoices will have a hanging subscription_id. So we drop it:
ALTER TABLE saas_invoices DROP COLUMN subscription_id;

DROP TABLE tenant_profiles;
DROP TABLE tenant_subscriptions;

SET FOREIGN_KEY_CHECKS = 1;
