-- Final schema: holidays
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 016_create_holidays.sql
CREATE TABLE holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    description TEXT,
    is_recurring_yearly TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(branch_id, holiday_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
