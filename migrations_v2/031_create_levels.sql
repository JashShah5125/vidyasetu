-- Final schema: levels
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 028_create_levels.sql, 110_fix_database_schema_inconsistencies.sql
-- Change: added duration VARCHAR(50), removed sort_order, added course_id
CREATE TABLE levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    course_id INT NOT NULL,
    program_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    duration VARCHAR(50),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(program_id, code),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT
);
