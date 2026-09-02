-- Seed for users table
-- Sourced from 05_seed_test_tenants.sql

-- Seed Master HQ admin user (tenant_id=1 = master HQ)
-- Password: admin123 (bcrypt hash)
INSERT IGNORE INTO users (id, tenant_id, name, email, password_hash, user_type, status) VALUES
(1, 1, 'Super Admin', 'admin@vidyasetu.com', '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'saas_admin', 'active'),
(2, 2, 'Allen Admin', 'owner@allen.ac.in', '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active');
