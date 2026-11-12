CREATE TABLE plan_features (
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

CREATE TABLE plan_limits (
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

CREATE TABLE plan_support (
    plan_id INT PRIMARY KEY,
    email_support TINYINT(1) NOT NULL DEFAULT 0,
    chat_support TINYINT(1) NOT NULL DEFAULT 0,
    phone_support TINYINT(1) NOT NULL DEFAULT 0,
    dedicated_account_manager TINYINT(1) NOT NULL DEFAULT 0,
    onboarding_assistance TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

CREATE TABLE plan_branding (
    plan_id INT PRIMARY KEY,
    white_label TINYINT(1) NOT NULL DEFAULT 0,
    custom_domain TINYINT(1) NOT NULL DEFAULT 0,
    custom_logo TINYINT(1) NOT NULL DEFAULT 0,
    custom_email_templates TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

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
