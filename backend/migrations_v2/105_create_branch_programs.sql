-- Final schema: branch_programs
-- Maps the programs (of a course) that a branch offers.
-- Enables the per-branch course -> program selection captured in the
-- frontend "Courses & Programs" tab of BranchDetail.
-- Idempotent: safe to run when the table already exists (dev databases where
-- it was created ad-hoc before this migration was tracked).
CREATE TABLE IF NOT EXISTS branch_programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    course_id INT NOT NULL,
    program_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_branch_programs (branch_id, program_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure the unique index exists even if the table pre-existed without it.
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'branch_programs'
      AND index_name = 'uq_branch_programs'
);
SET @ddl = IF(@idx_exists = 0,
    'ALTER TABLE branch_programs ADD UNIQUE INDEX uq_branch_programs (branch_id, program_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;