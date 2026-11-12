-- Final schema: subscription_plans
-- Merged from: 001_create_subscription_plans.sql, 107_modify_subscription_plans.sql
CREATE TABLE subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('Active', 'Inactive', 'Deleted') NOT NULL DEFAULT 'Active',
    display_order INT NOT NULL DEFAULT 0,
    notes TEXT,
    visible_to JSON,
    monthly_price DECIMAL(10,2) DEFAULT 0.00,
    quarterly_price DECIMAL(10,2) DEFAULT 0.00,
    half_yearly_price DECIMAL(10,2) DEFAULT 0.00,
    yearly_price DECIMAL(10,2) DEFAULT 0.00,
    lifetime_price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    trial_days INT DEFAULT 0,
    trial_period_days INT NOT NULL DEFAULT 0,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    auto_renewal TINYINT(1) DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
