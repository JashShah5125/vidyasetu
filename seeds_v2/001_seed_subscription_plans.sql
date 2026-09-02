-- Seed for subscription_plans table
-- Sourced from 08_seed_subscription_plans.sql

-- Seed subscription plans (Basic Info and Pricing)
INSERT IGNORE INTO subscription_plans (
    id, name, code, description, status, display_order, notes,
    monthly_price, quarterly_price, half_yearly_price, yearly_price, lifetime_price,
    currency, trial_days, setup_fee, auto_renewal
) VALUES
(1, 'Starter Trial', 'STARTER', '14 Days free trial for evaluating the platform.', 'Active', 1, 'Initial evaluation plan', 0.00, 0.00, 0.00, 0.00, 0.00, 'INR', 14, 0.00, 0),
(2, 'Growth Plan', 'GROWTH', 'Perfect for small and growing institutes.', 'Active', 2, 'Standard paid plan', 4999.00, 14997.00, 29994.00, 49990.00, 0.00, 'INR', 0, 4999.00, 1),
(3, 'Pro Enterprise', 'PRO', 'Unlimited scale for large organizations.', 'Active', 3, 'Enterprise high scale plan', 19999.00, 59997.00, 119994.00, 199990.00, 0.00, 'INR', 0, 0.00, 1);
