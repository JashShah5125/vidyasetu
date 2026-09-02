-- Seed for user_branch_access table
-- Links each branch admin to their branch as the primary admin
-- (is_primary = 1). Rows reference the branch admin users seeded in
-- 020_seed_branch_admins.sql and the branches seeded in 018_seed_branches.sql.

INSERT IGNORE INTO user_branch_access (id, tenant_id, user_id, branch_id, is_primary, granted_by) VALUES
-- Seema Deshpande -> Mumbai West (branch_id = 1)
(1, 2, 101, 1, 1, 2),

-- Ramesh Shinde -> Pune Camp (branch_id = 2)
(2, 2, 102, 2, 1, 2),

-- Aakash Dwarka Head -> Aakash Dwarka (branch_id = 3)
(3, 3, 103, 3, 1, 1);