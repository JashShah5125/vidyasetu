-- Final schema: guardians
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 044_create_guardians.sql, 111_fix_student_guardian_fields.sql
-- Change: first_name+last_name replaced by full_name
CREATE TABLE guardians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT,
    full_name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    occupation VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
