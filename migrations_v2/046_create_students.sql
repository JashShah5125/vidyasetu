-- Final schema: students
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 043_create_students.sql, 110_fix_database_schema_inconsistencies.sql,
--              111_fix_student_guardian_fields.sql
-- Changes: first_name+last_name replaced by full_name; added street, pincode, year_of_attempt
-- Note: FK from enquiries.converted_student_id added at bottom of this file
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT,
    primary_branch_id INT NOT NULL,
    student_code VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(255),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    category VARCHAR(50),
    school_name VARCHAR(255),
    current_class VARCHAR(50),
    board_id INT,
    target_exam VARCHAR(100),
    year_of_attempt VARCHAR(20),
    blood_group VARCHAR(10),
    profile_photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'registration_pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (primary_branch_id) REFERENCES branches(id),
    FOREIGN KEY (board_id) REFERENCES boards(id)
);
CREATE UNIQUE INDEX idx_students_code ON students(tenant_id, student_code);
CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_branch ON students(tenant_id, primary_branch_id);
CREATE INDEX idx_students_status ON students(tenant_id, status);

-- Deferred FK: enquiries.converted_student_id references students(id)
ALTER TABLE enquiries
    ADD CONSTRAINT fk_enquiries_student
    FOREIGN KEY (converted_student_id) REFERENCES students(id) ON DELETE SET NULL;
