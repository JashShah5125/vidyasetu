-- Final schema: plan_branding
-- Sourced from: 002_create_plan_features.sql (split)
CREATE TABLE plan_branding (
    plan_id INT PRIMARY KEY,
    white_label TINYINT(1) NOT NULL DEFAULT 0,
    custom_domain TINYINT(1) NOT NULL DEFAULT 0,
    custom_logo TINYINT(1) NOT NULL DEFAULT 0,
    custom_email_templates TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
