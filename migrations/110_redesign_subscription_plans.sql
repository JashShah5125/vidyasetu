SET FOREIGN_KEY_CHECKS = 0;

-- Drop old tables that reference subscription_plans
DROP TABLE IF EXISTS tenant_subscriptions;
DROP TABLE IF EXISTS plan_features;
DROP TABLE IF EXISTS subscription_plans;

-- 1. Create subscription_plans (Basic Info)
CREATE TABLE subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    display_order INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);

-- 2. Create plan_billing (Billing Information)
CREATE TABLE plan_billing (
    plan_id INT PRIMARY KEY,
    billing_type ENUM('Monthly', 'Quarterly', 'Yearly', 'Lifetime') NOT NULL DEFAULT 'Monthly',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    trial_days INT NOT NULL DEFAULT 0,
    setup_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    renewal_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    auto_renewal TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- 3. Create plan_resource_limits (Resource Quotas)
CREATE TABLE plan_resource_limits (
    plan_id INT PRIMARY KEY,
    max_instances INT NOT NULL DEFAULT -1,
    max_branches INT NOT NULL DEFAULT -1,
    max_staff_users INT NOT NULL DEFAULT -1,
    max_students INT NOT NULL DEFAULT -1,
    max_parents INT NOT NULL DEFAULT -1,
    max_teachers INT NOT NULL DEFAULT -1,
    max_storage VARCHAR(50) NOT NULL DEFAULT '-1',
    max_file_size VARCHAR(50) NOT NULL DEFAULT '-1',
    max_sms_credits INT NOT NULL DEFAULT -1,
    max_whatsapp_msgs INT NOT NULL DEFAULT -1,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- 4. Create plan_feature_access (ERP & Academic Features)
CREATE TABLE plan_feature_access (
    plan_id INT PRIMARY KEY,
    admissions TINYINT(1) NOT NULL DEFAULT 0,
    student_management TINYINT(1) NOT NULL DEFAULT 0,
    parent_portal TINYINT(1) NOT NULL DEFAULT 0,
    teacher_portal TINYINT(1) NOT NULL DEFAULT 0,
    attendance TINYINT(1) NOT NULL DEFAULT 0,
    timetable TINYINT(1) NOT NULL DEFAULT 0,
    assignments TINYINT(1) NOT NULL DEFAULT 0,
    exams TINYINT(1) NOT NULL DEFAULT 0,
    results TINYINT(1) NOT NULL DEFAULT 0,
    doubts TINYINT(1) NOT NULL DEFAULT 0,
    fees TINYINT(1) NOT NULL DEFAULT 0,
    payroll TINYINT(1) NOT NULL DEFAULT 0,
    income TINYINT(1) NOT NULL DEFAULT 0,
    expenses TINYINT(1) NOT NULL DEFAULT 0,
    notifications TINYINT(1) NOT NULL DEFAULT 0,
    sms TINYINT(1) NOT NULL DEFAULT 0,
    whatsapp TINYINT(1) NOT NULL DEFAULT 0,
    email TINYINT(1) NOT NULL DEFAULT 0,
    reports TINYINT(1) NOT NULL DEFAULT 0,
    audit_logs TINYINT(1) NOT NULL DEFAULT 0,
    import_export TINYINT(1) NOT NULL DEFAULT 0,
    api_access TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- 5. Create plan_support (Support Tiers)
CREATE TABLE plan_support (
    plan_id INT PRIMARY KEY,
    email_support TINYINT(1) NOT NULL DEFAULT 0,
    chat_support TINYINT(1) NOT NULL DEFAULT 0,
    phone_support TINYINT(1) NOT NULL DEFAULT 0,
    dedicated_account_manager TINYINT(1) NOT NULL DEFAULT 0,
    onboarding_assistance TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- 6. Create plan_branding (Branding Configs)
CREATE TABLE plan_branding (
    plan_id INT PRIMARY KEY,
    white_label TINYINT(1) NOT NULL DEFAULT 0,
    custom_domain TINYINT(1) NOT NULL DEFAULT 0,
    custom_logo TINYINT(1) NOT NULL DEFAULT 0,
    custom_email_templates TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- 7. Create plan_integrations (Integration Configs)
CREATE TABLE plan_integrations (
    plan_id INT PRIMARY KEY,
    razorpay TINYINT(1) NOT NULL DEFAULT 0,
    cashfree TINYINT(1) NOT NULL DEFAULT 0,
    whatsapp_business TINYINT(1) NOT NULL DEFAULT 0,
    zoom TINYINT(1) NOT NULL DEFAULT 0,
    google_meet TINYINT(1) NOT NULL DEFAULT 0,
    google_calendar TINYINT(1) NOT NULL DEFAULT 0,
    biometric_devices TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- Recreate tenant_subscriptions
CREATE TABLE tenant_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    plan_id INT NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'annual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    trial_ends_at DATE,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
CREATE INDEX idx_tenant_subs_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subs_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subs_renewal ON tenant_subscriptions(renewal_date);

SET FOREIGN_KEY_CHECKS = 1;
