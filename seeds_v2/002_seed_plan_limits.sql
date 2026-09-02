-- Seed for plan_limits table
-- Sourced from 08_seed_subscription_plans.sql

-- Seed plan_limits
INSERT IGNORE INTO plan_limits (plan_id, max_instances, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs) VALUES
(1, 1, 1, 10, 100, 200, 10, '5 GB', '10 MB', 100, 0),
(2, 5, 5, 50, 1000, 2000, 50, '20 GB', '50 MB', 5000, 1000),
(3, -1, -1, -1, -1, -1, -1, '100 GB', '100 MB', -1, -1);
