-- Final schema: tenants
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 007_create_tenants.sql, 108_add_primary_admin_to_tenants.sql,
--              112_merge_tenant_tables.sql, 113_add_alternate_emails.sql,
--              114_rename_owner_email_to_primary_email.sql, 115_enforce_not_null.sql,
--              118_add_subscription_overrides.sql
-- Note: tenant_profiles and tenant_subscriptions tables were dropped by 112 and are NOT created.
CREATE TABLE tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    tenant_type ENUM('master', 'customer') NOT NULL DEFAULT 'customer',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    -- Merged from tenant_profiles
    owner_name VARCHAR(255) NOT NULL,
    primary_email VARCHAR(255) NOT NULL,
    owner_mobile VARCHAR(20),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    logo_url TEXT,
    primary_color VARCHAR(7),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    website VARCHAR(255),
    alternate_emails JSON DEFAULT NULL,

    -- Merged from tenant_subscriptions
    plan_id INT,
    subscription_status VARCHAR(20) DEFAULT 'active',
    billing_cycle VARCHAR(10) DEFAULT 'annual',
    start_date DATE,
    end_date DATE,
    renewal_date DATE,
    trial_ends_at DATE,
    subscription_notes TEXT,

    -- Subscription financial overrides (from 118)
    subscription_discount DECIMAL(5,2) DEFAULT NULL,
    subscription_final_price DECIMAL(10,2) DEFAULT NULL,
    subscription_tax DECIMAL(5,2) DEFAULT NULL,
    subscription_invoice_number VARCHAR(100) DEFAULT NULL,

    -- Per-tenant resource overrides (from 118)
    override_max_branches INT DEFAULT NULL,
    override_max_staff_users INT DEFAULT NULL,
    override_max_students INT DEFAULT NULL,
    override_max_parents INT DEFAULT NULL,
    override_max_teachers INT DEFAULT NULL,
    override_max_storage VARCHAR(50) DEFAULT NULL,
    override_max_file_size VARCHAR(50) DEFAULT NULL,
    override_max_sms_credits INT DEFAULT NULL,
    override_max_whatsapp_msgs INT DEFAULT NULL,

    -- Primary admin user link (from 108)
    primary_admin_user_id INT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,

    CONSTRAINT fk_tenants_plan_id FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
    -- fk_tenants_primary_admin is added after users table is created (see 017)
);
