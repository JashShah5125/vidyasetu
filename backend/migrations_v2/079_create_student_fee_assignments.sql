-- Final schema: student_fee_assignments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 076_create_student_fee_assignments.sql
CREATE TABLE student_fee_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    enrollment_id INT NOT NULL UNIQUE,
    fee_plan_id INT,
    gross_amount DECIMAL(10,2) NOT NULL,
    total_concession DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE RESTRICT
);
