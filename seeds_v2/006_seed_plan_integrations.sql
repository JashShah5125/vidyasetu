-- Seed for plan_integrations table
-- Sourced from 08_seed_subscription_plans.sql

-- Seed plan_integrations
INSERT IGNORE INTO plan_integrations (plan_id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices) VALUES
(1, 0, 0, 0, 0, 0, 0, 0),
(2, 1, 0, 0, 1, 1, 1, 0),
(3, 1, 1, 1, 1, 1, 1, 1);
