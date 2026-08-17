CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    primary_branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    student_code VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    category VARCHAR(50),
    school_name VARCHAR(255),
    current_class VARCHAR(50),
    board_id VARCHAR(36) REFERENCES boards(id),
    target_exam VARCHAR(100),
    blood_group VARCHAR(10),
    profile_photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'registration_pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
CREATE UNIQUE INDEX idx_students_code ON students(tenant_id, student_code);
CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_branch ON students(tenant_id, primary_branch_id);
CREATE INDEX idx_students_status ON students(tenant_id, status);
ALTER TABLE enquiries ADD CONSTRAINT fk_enquiries_student FOREIGN KEY (converted_student_id) REFERENCES students(id) ON DELETE SET NULL;
