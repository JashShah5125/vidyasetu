-- 123_staff_ops_seed.sql
-- Tenant 2 (Allen Career Institute) operational staff for both branches.
-- Branch 1 = Mumbai West, Branch 2 = Pune Camp.
--
-- Adds to staff_profiles:
--   * Branch Admins  : users 101 (Seema Deshpande, Mumbai West) & 102 (Ramesh Shinde, Pune Camp)
--                      already exist as users with the branch_admin role (3); only profiles were missing.
--   * Counsellors    : 1 per branch (role 4)
--   * Finance        : 1 per branch (role 6)
--
-- Idempotent via INSERT IGNORE / NOT EXISTS guards.

-- 1. Create user accounts for the 4 new operational staff (users 601-604).
INSERT INTO users (
    id, tenant_id, name, email, mobile, password_hash, user_type, status,
    app_access_suspended, must_change_password, created_by, updated_by
)
SELECT 601, 2, 'Priya Kulkarni', 'priya.counsel@apexiit.com', '9876543101',
       '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'priya.counsel@apexiit.com');

INSERT INTO users (
    id, tenant_id, name, email, mobile, password_hash, user_type, status,
    app_access_suspended, must_change_password, created_by, updated_by
)
SELECT 602, 2, 'Nitin Bhandari', 'nitin.bills@apexiit.com', '9876543102',
       '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nitin.bills@apexiit.com');

INSERT INTO users (
    id, tenant_id, name, email, mobile, password_hash, user_type, status,
    app_access_suspended, must_change_password, created_by, updated_by
)
SELECT 603, 2, 'Sonal Gaikwad', 'sonal.counsel@apexiit.com', '9876543103',
       '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sonal.counsel@apexiit.com');

INSERT INTO users (
    id, tenant_id, name, email, mobile, password_hash, user_type, status,
    app_access_suspended, must_change_password, created_by, updated_by
)
SELECT 604, 2, 'Rajesh Kulkarni', 'rajesh.finance@apexiit.com', '9876543104',
       '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 1, 2, 2
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rajesh.finance@apexiit.com');

-- 2. Assign counsellor (4) / finance (6) roles.
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES
(601, 4, 2),
(602, 6, 2),
(603, 4, 2),
(604, 6, 2);

-- 3. Grant branch access (primary branch) to the new operational staff.
INSERT INTO user_branch_access (tenant_id, user_id, branch_id, is_primary, granted_by)
SELECT 2, 601, 1, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM user_branch_access WHERE tenant_id = 2 AND user_id = 601 AND branch_id = 1);

INSERT INTO user_branch_access (tenant_id, user_id, branch_id, is_primary, granted_by)
SELECT 2, 602, 1, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM user_branch_access WHERE tenant_id = 2 AND user_id = 602 AND branch_id = 1);

INSERT INTO user_branch_access (tenant_id, user_id, branch_id, is_primary, granted_by)
SELECT 2, 603, 2, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM user_branch_access WHERE tenant_id = 2 AND user_id = 603 AND branch_id = 2);

INSERT INTO user_branch_access (tenant_id, user_id, branch_id, is_primary, granted_by)
SELECT 2, 604, 2, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM user_branch_access WHERE tenant_id = 2 AND user_id = 604 AND branch_id = 2);

-- 4. Staff profiles (users 101 & 102 already existed; 601-604 created above).
INSERT IGNORE INTO staff_profiles (
    tenant_id, branch_ids, user_id, employee_id, contact_number, first_name, last_name, gender,
    employee_type, designation, department, employment_type, employment_status, status
) VALUES
(2, JSON_ARRAY(1), 101, 'EMP-1028', '9876543210', 'Seema', 'Deshpande', 'Female',
 'Non-Teaching', 'Branch Admin', 'Administration', 'full_time', 'active', 'active'),
(2, JSON_ARRAY(2), 102, 'EMP-1029', '9123456789', 'Ramesh', 'Shinde', 'Male',
 'Non-Teaching', 'Branch Admin', 'Administration', 'full_time', 'active', 'active'),
(2, JSON_ARRAY(1), 601, 'EMP-1030', '9876543101', 'Priya', 'Kulkarni', 'Female',
 'Non-Teaching', 'Senior Counsellor', 'Admissions & Counselling', 'full_time', 'active', 'active'),
(2, JSON_ARRAY(1), 602, 'EMP-1031', '9876543102', 'Nitin', 'Bhandari', 'Male',
 'Non-Teaching', 'Accounts Executive', 'Finance & Accounts', 'full_time', 'active', 'active'),
(2, JSON_ARRAY(2), 603, 'EMP-1032', '9876543103', 'Sonal', 'Gaikwad', 'Female',
 'Non-Teaching', 'Counsellor', 'Admissions & Counselling', 'full_time', 'active', 'active'),
(2, JSON_ARRAY(2), 604, 'EMP-1033', '9876543104', 'Rajesh', 'Kulkarni', 'Male',
 'Non-Teaching', 'Accounts Executive', 'Finance & Accounts', 'full_time', 'active', 'active');