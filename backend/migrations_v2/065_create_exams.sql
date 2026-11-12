-- Final schema: exams
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 062_create_exams.sql
CREATE TABLE exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    subject_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2),
    exam_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
