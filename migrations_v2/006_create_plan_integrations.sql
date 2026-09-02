-- Final schema: plan_integrations
-- Sourced from: 002_create_plan_features.sql (split)
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
