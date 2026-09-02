-- Final schema: receipts
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 078_create_receipts.sql
CREATE TABLE receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    enrollment_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    receipt_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE RESTRICT
);
