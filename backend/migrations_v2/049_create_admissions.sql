-- Final schema: admissions
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 046_create_admissions.sql
CREATE TABLE admissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    student_id INT NOT NULL,
    enquiry_id INT,
    admission_date DATE NOT NULL,
    admission_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(tenant_id, admission_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL
);
