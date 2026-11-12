CREATE TABLE enquiries (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id),
    preferred_branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    assigned_branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    source_id VARCHAR(36) REFERENCES enquiry_sources(id),
    student_name VARCHAR(255) NOT NULL,
    student_mobile VARCHAR(20) NOT NULL,
    student_email VARCHAR(255),
    parent_name VARCHAR(255),
    parent_mobile VARCHAR(20),
    interested_course_id VARCHAR(36) REFERENCES courses(id),
    interested_program_id VARCHAR(36) REFERENCES programs(id),
    interested_level_id VARCHAR(36) REFERENCES levels(id),
    counsellor_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    lost_reason TEXT,
    conversion_probability INTEGER,
    demo_scheduled_at DATETIME,
    next_followup_at DATETIME,
    converted_student_id VARCHAR(36),
    converted_at DATETIME,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
CREATE INDEX idx_enquiries_branch ON enquiries(tenant_id, assigned_branch_id);
CREATE INDEX idx_enquiries_status ON enquiries(tenant_id, status);
CREATE INDEX idx_enquiries_counsellor ON enquiries(counsellor_id);
