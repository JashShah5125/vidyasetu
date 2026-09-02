-- Seed for branches table
-- Branch centers for the seeded customer tenants. Core branch tables are empty
-- until this seed runs, mirroring the branch setups shown in the frontend.
-- Branches for tenant 2 (Allen Career Institute) align with its seeded courses
-- (see 015_seed_courses.sql / 016_seed_programs.sql).

INSERT IGNORE INTO branches (
    id, tenant_id, name, code, address_line1, city, state, pincode,
    phone, email, capacity, operating_hours, status,
    bank_account_name, bank_account_number, bank_ifsc, bank_name,
    created_by, updated_by
) VALUES
-- Allen Career Institute (tenant_id = 2)
(1, 2, 'Mumbai West', 'MUM-WEST', '101, Western Heights, Andheri West', 'Mumbai', 'Maharashtra', '400053',
 '022-26345566', 'mumbaiwest@apexiit.com', 300, '08:00 AM - 08:00 PM', 'active',
 'Apex IIT Academy - Mumbai West', '50100234567890', 'HDFC0001234', 'HDFC Bank',
 2, 2),

(2, 2, 'Pune Camp', 'PUN-CAMP', '45, MG Road, Camp', 'Pune', 'Maharashtra', '411001',
 '020-24445566', 'punecamp@apexiit.com', 150, '09:00 AM - 06:00 PM', 'active',
 NULL, NULL, NULL, NULL,
 2, 2),

-- Aakash Institute Dwarka (tenant_id = 3)
(3, 3, 'Aakash Dwarka', 'AAK-DWARKA', 'Sector 11, Dwarka', 'New Delhi', 'Delhi', '110075',
 '011-45678901', 'dwarka@aakash.ac.in', 250, '07:30 AM - 09:00 PM', 'active',
 NULL, NULL, NULL, NULL,
 1, 1);