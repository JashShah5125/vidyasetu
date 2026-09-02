-- Final schema: fee_plan_items
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 071_create_fee_plan_items.sql
CREATE TABLE fee_plan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    fee_plan_id INT NOT NULL,
    fee_head_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id) ON DELETE RESTRICT
);
