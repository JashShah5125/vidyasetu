-- Seed subscription plans (Basic Info and Pricing)
INSERT IGNORE INTO subscription_plans (
    id, name, code, description, status, display_order, notes,
    monthly_price, quarterly_price, half_yearly_price, yearly_price, lifetime_price,
    currency, trial_days, setup_fee, auto_renewal
) VALUES
(1, 'Starter Trial', 'STARTER', '14 Days free trial for evaluating the platform.', 'Active', 1, 'Initial evaluation plan', 0.00, 0.00, 0.00, 0.00, 0.00, 'INR', 14, 0.00, 0),
(2, 'Growth Plan', 'GROWTH', 'Perfect for small and growing institutes.', 'Active', 2, 'Standard paid plan', 4999.00, 14997.00, 29994.00, 49990.00, 0.00, 'INR', 0, 4999.00, 1),
(3, 'Pro Enterprise', 'PRO', 'Unlimited scale for large organizations.', 'Active', 3, 'Enterprise high scale plan', 19999.00, 59997.00, 119994.00, 199990.00, 0.00, 'INR', 0, 0.00, 1);

-- Seed plan_limits
INSERT IGNORE INTO plan_limits (plan_id, max_instances, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs) VALUES
(1, 1, 1, 10, 100, 200, 10, '5 GB', '10 MB', 100, 0),
(2, 5, 5, 50, 1000, 2000, 50, '20 GB', '50 MB', 5000, 1000),
(3, -1, -1, -1, -1, -1, -1, '100 GB', '100 MB', -1, -1);

-- Seed plan_features (ERP & Academic Features)
INSERT IGNORE INTO plan_features (plan_id, admissions, student_management, parent_portal, teacher_portal, attendance, timetable, assignments, exams, results, doubts, fees, payroll, income, expenses, notifications, sms, whatsapp, email, reports, audit_logs, import_export, api_access) VALUES
(1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0),
(2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0),
(3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);

-- Seed plan_support
INSERT IGNORE INTO plan_support (plan_id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance) VALUES
(1, 1, 0, 0, 0, 0),
(2, 1, 1, 0, 0, 1),
(3, 1, 1, 1, 1, 1);

-- Seed plan_branding
INSERT IGNORE INTO plan_branding (plan_id, white_label, custom_domain, custom_logo, custom_email_templates) VALUES
(1, 0, 0, 0, 0),
(2, 0, 0, 1, 0),
(3, 1, 1, 1, 1);

-- Seed plan_integrations
INSERT IGNORE INTO plan_integrations (plan_id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices) VALUES
(1, 0, 0, 0, 0, 0, 0, 0),
(2, 1, 0, 0, 1, 1, 1, 0),
(3, 1, 1, 1, 1, 1, 1, 1);
