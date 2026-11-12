-- Final schema: course_branches
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 110_fix_database_schema_inconsistencies.sql (new table)
CREATE TABLE course_branches (
    course_id INT NOT NULL,
    branch_id INT NOT NULL,
    PRIMARY KEY (course_id, branch_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
