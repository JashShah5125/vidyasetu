-- Final schema: salary_structure_components
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 086_create_salary_structure_components.sql
CREATE TABLE salary_structure_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    structure_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    amount_type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (structure_id) REFERENCES salary_structures(id) ON DELETE CASCADE
);
