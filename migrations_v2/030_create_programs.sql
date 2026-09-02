-- Final schema: programs
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 027_create_programs.sql
CREATE TABLE programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    course_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    duration VARCHAR(50),
    description TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(course_id, code),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
);
