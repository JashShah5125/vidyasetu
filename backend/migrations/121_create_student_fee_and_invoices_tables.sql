-- 121_create_student_fee_and_invoices_tables.sql
-- Create student_fee_assignments and student_invoices tables for 2-table fee management

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS student_invoices;
DROP TABLE IF EXISTS student_installments;
DROP TABLE IF EXISTS student_fee_assignments;

CREATE TABLE student_fee_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    
    fee_source_type VARCHAR(30) NOT NULL DEFAULT 'program',
    fee_source_id INT,
    
    gross_amount DECIMAL(10,2) NOT NULL,
    total_concession DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    installment_count INT NOT NULL DEFAULT 1,
    installment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    
    UNIQUE KEY uk_student_enrollment_fee (student_id, enrollment_id),
    KEY idx_sfa_tenant_branch (tenant_id, branch_id),
    KEY idx_sfa_status (tenant_id, status)
);

CREATE TABLE student_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    fee_assignment_id INT NOT NULL,
    
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    installment_number INT NOT NULL DEFAULT 0,
    description VARCHAR(255),
    
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATETIME,
    
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(10,2) NOT NULL,
    
    payment_mode VARCHAR(50),
    transaction_reference VARCHAR(100),
    remarks TEXT,
    
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    
    KEY idx_si_student (student_id),
    KEY idx_si_fee_assignment (fee_assignment_id),
    KEY idx_si_tenant_status (tenant_id, status),
    KEY idx_si_due_date (tenant_id, due_date)
);

SET FOREIGN_KEY_CHECKS = 1;
