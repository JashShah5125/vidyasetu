-- Final schema: enquiries
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 040_create_enquiries.sql
-- Note: FK to students(id) for converted_student_id is added at end of 044_create_students.sql
CREATE TABLE enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    preferred_branch_id INT NOT NULL,
    assigned_branch_id INT NOT NULL,
    source_id INT,
    student_name VARCHAR(255) NOT NULL,
    student_mobile VARCHAR(20) NOT NULL,
    student_email VARCHAR(255),
    parent_name VARCHAR(255),
    parent_mobile VARCHAR(20),
    interested_course_id INT,
    interested_program_id INT,
    interested_level_id INT,
    counsellor_id INT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    lost_reason TEXT,
    conversion_probability INTEGER,
    demo_scheduled_at DATETIME,
    next_followup_at DATETIME,
    converted_student_id INT,
    converted_at DATETIME,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (preferred_branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_branch_id) REFERENCES branches(id),
    FOREIGN KEY (source_id) REFERENCES enquiry_sources(id),
    FOREIGN KEY (interested_course_id) REFERENCES courses(id),
    FOREIGN KEY (interested_program_id) REFERENCES programs(id),
    FOREIGN KEY (interested_level_id) REFERENCES levels(id),
    FOREIGN KEY (counsellor_id) REFERENCES users(id)
);
CREATE INDEX idx_enquiries_branch ON enquiries(tenant_id, assigned_branch_id);
CREATE INDEX idx_enquiries_status ON enquiries(tenant_id, status);
CREATE INDEX idx_enquiries_counsellor ON enquiries(counsellor_id);
