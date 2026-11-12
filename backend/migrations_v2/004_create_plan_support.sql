-- Final schema: plan_support
-- Sourced from: 002_create_plan_features.sql (split)
CREATE TABLE plan_support (
    plan_id INT PRIMARY KEY,
    email_support TINYINT(1) NOT NULL DEFAULT 0,
    chat_support TINYINT(1) NOT NULL DEFAULT 0,
    phone_support TINYINT(1) NOT NULL DEFAULT 0,
    dedicated_account_manager TINYINT(1) NOT NULL DEFAULT 0,
    onboarding_assistance TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
