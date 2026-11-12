ALTER TABLE subscription_plans ADD COLUMN description TEXT;
ALTER TABLE subscription_plans ADD COLUMN trial_period_days INT NOT NULL DEFAULT 0;
