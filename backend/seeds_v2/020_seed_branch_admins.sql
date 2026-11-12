-- Seed for branch_admin users and their roles.
-- Branch admins are real user records (user_type = 'staff') holding the
-- branch_admin role (id = 3 from 009_seed_roles.sql). Explicit IDs start at
-- 101 so they never collide with auto-generated user rows.
-- Password: admin123 (same bcrypt hash as 008_seed_users.sql).

INSERT IGNORE INTO users (
    id, tenant_id, name, email, mobile, password_hash, user_type, status,
    app_access_suspended, must_change_password, created_by, updated_by
) VALUES
(101, 2, 'Seema Deshpande', 'seema@apexiit.com', '9876543210',
 '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2),

(102, 2, 'Ramesh Shinde', 'ramesh@apexiit.com', '9123456789',
 '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2),

(103, 3, 'Aakash Dwarka Head', 'centerhead@aakash.ac.in', '9876500101',
 '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 1, 1);

-- Assign the branch_admin role (id = 3) to each branch admin.
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES
(101, 3, 2),
(102, 3, 2),
(103, 3, 1);