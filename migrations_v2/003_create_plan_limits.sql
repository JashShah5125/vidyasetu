-- Final schema: plan_limits
-- Sourced from: 002_create_plan_features.sql (split)
CREATE TABLE plan_limits (
    plan_id INT PRIMARY KEY,
    max_branches INT NOT NULL DEFAULT -1,
    max_staff_users INT NOT NULL DEFAULT -1,
    max_students INT NOT NULL DEFAULT -1,
    max_parents INT NOT NULL DEFAULT -1,
    max_teachers INT NOT NULL DEFAULT -1,
    max_storage VARCHAR(50) NOT NULL DEFAULT '-1',
    max_file_size VARCHAR(50) NOT NULL DEFAULT '-1',
    max_sms_credits INT NOT NULL DEFAULT -1,
    max_whatsapp_msgs INT NOT NULL DEFAULT -1,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
