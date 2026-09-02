-- Seed for plan_branding table
-- Sourced from 08_seed_subscription_plans.sql

-- Seed plan_branding
INSERT IGNORE INTO plan_branding (plan_id, white_label, custom_domain, custom_logo, custom_email_templates) VALUES
(1, 0, 0, 0, 0),
(2, 0, 0, 1, 0),
(3, 1, 1, 1, 1);
