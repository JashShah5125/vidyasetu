-- Seed for plan_support table
-- Sourced from 08_seed_subscription_plans.sql

-- Seed plan_support
INSERT IGNORE INTO plan_support (plan_id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance) VALUES
(1, 1, 0, 0, 0, 0),
(2, 1, 1, 0, 0, 1),
(3, 1, 1, 1, 1, 1);
