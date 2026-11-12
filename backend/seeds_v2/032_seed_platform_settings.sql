-- 032_seed_platform_settings.sql
-- Seed initial general platform configuration settings for Vidya Setu

INSERT INTO platform_settings (category, key_name, value, is_secret)
VALUES 
('general', 'saas_platform_name', 'Vidya Setu', 0),
('general', 'global_support_relay_email', 'support@vidyasetu.com', 0),
('general', 'default_gst_rate', '18', 0),
('general', 'platform_base_currency', 'INR', 0),
('general', 'admin_idle_timeout', '60', 0),
('general', 'plan_expiry_warning_days', '15', 0)
ON DUPLICATE KEY UPDATE
    value = VALUES(value),
    is_secret = VALUES(is_secret);
