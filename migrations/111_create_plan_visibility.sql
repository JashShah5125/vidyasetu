CREATE TABLE IF NOT EXISTS plan_visibility (
    plan_id INT NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (plan_id, tenant_id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
