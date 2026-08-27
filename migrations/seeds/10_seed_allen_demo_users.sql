-- =====================================================================
-- 10_seed_allen_demo_users.sql
-- Demo credentials for the 'Allen Career Institute' customer tenant.
-- Tenant ID 2 = Allen Career Institute (see 05_seed_test_tenants.sql)
-- All users share the same password: admin123 (bcrypt hash reused from 05).
-- =====================================================================

-- Pin session character set/collation so string literal comparisons match
-- the columns (all string columns are utf8mb4_0900_ai_ci).
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET @tenant_id = 2;
SET @branch_id = 1;
SET @pw_hash   = '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66'; -- admin123

-- ---------------------------------------------------------------------
-- 1. Seed one Allen branch (idempotent)
-- ---------------------------------------------------------------------
INSERT INTO branches (
    id, tenant_id, name, code, address_line1, city, state, pincode,
    phone, email, capacity, operating_hours, status
) VALUES (
    @branch_id, @tenant_id, 'Allen Kota HQ', 'ALLEN-KOTA',
    'Indra Vihar', 'Kota', 'Rajasthan', '324005',
    '9876543210', 'branch@allen.ac.in', 2000, 'Mon-Sat 8:00-20:00', 'active'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ---------------------------------------------------------------------
-- 2. Seed tenant-level roles for Allen (if not already present)
--    (tenantService auto-creates inst_admin at runtime, so guard each)
-- ---------------------------------------------------------------------
INSERT INTO roles (tenant_id, name, code, description, is_system, is_active)
SELECT @tenant_id, 'Institute Admin', 'inst_admin', 'Full access to institute', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'inst_admin' AND tenant_id = @tenant_id);

INSERT INTO roles (tenant_id, name, code, description, is_system, is_active)
SELECT @tenant_id, 'Branch Admin', 'branch_admin', 'Branch operations and registrations', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'branch_admin' AND tenant_id = @tenant_id);

INSERT INTO roles (tenant_id, name, code, description, is_system, is_active)
SELECT @tenant_id, 'Counsellor', 'counsellor', 'Lead pipeline and enquiry logs', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'counsellor' AND tenant_id = @tenant_id);

INSERT INTO roles (tenant_id, name, code, description, is_system, is_active)
SELECT @tenant_id, 'Teacher', 'teacher', 'Schedules and doubt clearance', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'teacher' AND tenant_id = @tenant_id);

INSERT INTO roles (tenant_id, name, code, description, is_system, is_active)
SELECT @tenant_id, 'Finance', 'finance', 'Fee ledger and invoice records', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'finance' AND tenant_id = @tenant_id);

-- ---------------------------------------------------------------------
-- 3. Seed users (idempotent). user_type = 'staff' (runtime convention).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO users (id, tenant_id, name, email, password_hash, user_type, status) VALUES
(100, @tenant_id, 'Allen Institute Admin', 'admin@allen.ac.in',       @pw_hash, 'staff', 'active'),
(101, @tenant_id, 'Allen Branch Admin',   'branch@allen.ac.in',       @pw_hash, 'staff', 'active'),
(102, @tenant_id, 'Allen Counsellor',     'counsel@allen.ac.in',      @pw_hash, 'staff', 'active'),
(103, @tenant_id, 'Allen Teacher',        'teacher@allen.ac.in',      @pw_hash, 'staff', 'active'),
(104, @tenant_id, 'Allen Finance',        'finance@allen.ac.in',      @pw_hash, 'staff', 'active');

-- ---------------------------------------------------------------------
-- 4. Assign roles in user_roles
-- ---------------------------------------------------------------------
INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id)
SELECT u.id, r.id, NULL, @tenant_id
FROM users u JOIN roles r ON r.code = 'inst_admin' AND r.tenant_id = @tenant_id
WHERE u.id = 100 AND u.tenant_id = @tenant_id
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id)
SELECT u.id, r.id, @branch_id, @tenant_id
FROM users u JOIN roles r ON r.code = 'branch_admin' AND r.tenant_id = @tenant_id
WHERE u.id = 101 AND u.tenant_id = @tenant_id
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id AND ur.branch_id = @branch_id);

INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id)
SELECT u.id, r.id, @branch_id, @tenant_id
FROM users u JOIN roles r ON r.code = 'counsellor' AND r.tenant_id = @tenant_id
WHERE u.id = 102 AND u.tenant_id = @tenant_id
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id AND ur.branch_id = @branch_id);

INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id)
SELECT u.id, r.id, @branch_id, @tenant_id
FROM users u JOIN roles r ON r.code = 'teacher' AND r.tenant_id = @tenant_id
WHERE u.id = 103 AND u.tenant_id = @tenant_id
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id AND ur.branch_id = @branch_id);

INSERT IGNORE INTO user_roles (user_id, role_id, branch_id, tenant_id)
SELECT u.id, r.id, @branch_id, @tenant_id
FROM users u JOIN roles r ON r.code = 'finance' AND r.tenant_id = @tenant_id
WHERE u.id = 104 AND u.tenant_id = @tenant_id
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id AND ur.branch_id = @branch_id);

-- ---------------------------------------------------------------------
-- 5. Grant branch access to branch-scoped users (branch admin, counsellor,
--    teacher, finance). Institute admin keeps NULL (institute-wide).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id, is_primary)
SELECT @tenant_id, u.id, @branch_id, 1
FROM users u
WHERE u.id IN (101, 102, 103, 104) AND u.tenant_id = @tenant_id
  AND NOT EXISTS (
      SELECT 1 FROM user_branch_access uba
      WHERE uba.user_id = u.id AND uba.branch_id = @branch_id
  );
