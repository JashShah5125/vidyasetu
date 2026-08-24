-- Seed testing subscription plans (removed old columns - now handled by 08_seed_subscription_plans.sql)

-- Seed Master HQ admin user (tenant_id=1 = master HQ)
-- Password: admin123 (bcrypt hash)
INSERT IGNORE INTO users (id, tenant_id, name, email, password_hash, user_type, status) VALUES
(1, 1, 'Super Admin', 'admin@vidyasetu.com', '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'saas_admin', 'active');

-- Seed dummy customer tenants (id=2 onwards)
INSERT IGNORE INTO tenants (id, name, slug, code, tenant_type, status) VALUES
(2, 'Allen Career Institute', 'allen', 'ALLEN', 'customer', 'active'),
(3, 'Aakash Institute', 'aakash', 'AAKASH', 'customer', 'active'),
(4, 'FIITJEE', 'fiitjee', 'FIITJEE', 'customer', 'suspended'),
(5, 'Resonance', 'resonance', 'RESO', 'customer', 'draft');

-- Seed profiles for dummy tenants
INSERT IGNORE INTO tenant_profiles (tenant_id, owner_name, owner_email, owner_mobile, address_line1, city, state, country, pincode) VALUES
(2, 'Rajesh Maheshwari', 'owner@allen.ac.in', '9876543210', 'Indra Vihar', 'Kota', 'Rajasthan', 'India', '324005'),
(3, 'JC Chaudhry', 'owner@aakash.ac.in', '9876543211', 'Sector 11', 'Dwarka', 'Delhi', 'India', '110075'),
(4, 'DK Goel', 'owner@fiitjee.com', '9876543212', 'Kalu Sarai', 'New Delhi', 'Delhi', 'India', '110016'),
(5, 'RK Verma', 'owner@resonance.ac.in', '9876543213', 'CG Tower', 'Kota', 'Rajasthan', 'India', '324005');

-- Seed subscriptions for dummy tenants
-- plan_id: 1=STARTER, 2=GROWTH, 3=PRO (matches auto-increment order above)
INSERT IGNORE INTO tenant_subscriptions (tenant_id, plan_id, status, billing_cycle, start_date, end_date, renewal_date) VALUES
(2, 3, 'active', 'annual', '2026-01-01', '2027-01-01', '2027-01-01'),
(3, 2, 'active', 'monthly', '2026-08-01', '2026-09-01', '2026-09-01'),
(4, 3, 'canceled', 'annual', '2025-01-01', '2026-01-01', '2026-01-01'),
(5, 1, 'trialing', 'monthly', '2026-08-15', '2026-08-29', '2026-08-29');
