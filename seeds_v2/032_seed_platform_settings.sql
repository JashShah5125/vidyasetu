-- Seed for platform_settings table
-- Defines global configuration and thresholds for the Vidyasetu platform

INSERT IGNORE INTO platform_settings (category, key_name, value, is_secret) VALUES
('billing', 'plan_expiry_warning_days', '15', 0);
