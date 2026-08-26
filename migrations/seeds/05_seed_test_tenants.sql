-- Seed Master HQ admin user (tenant_id=1 = master HQ)
-- Password: admin123 (bcrypt hash)
INSERT IGNORE INTO users (id, tenant_id, name, email, password_hash, user_type, status) VALUES
(1, 1, 'Super Admin', 'admin@vidyasetu.com', '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'saas_admin', 'active');

-- Seed dummy customer tenants (id=2 onwards) with profile and subscription data merged in
INSERT IGNORE INTO tenants (
    id, name, slug, code, tenant_type, status,
    owner_name, primary_email, owner_mobile, address_line1, city, state, country, pincode,
    plan_id, subscription_status, billing_cycle, start_date, end_date, renewal_date,
    gst_number, pan_number, logo_url, primary_color, timezone, website, trial_ends_at, subscription_notes,
    subscription_discount, subscription_final_price, subscription_tax, subscription_invoice_number,
    override_max_branches, override_max_staff_users, override_max_students, override_max_parents,
    override_max_teachers, override_max_storage, override_max_file_size, override_max_sms_credits, override_max_whatsapp_msgs
) VALUES
(2, 'Allen Career Institute', 'allen', 'ALLEN', 'customer', 'active',
 'Rajesh Maheshwari', 'owner@allen.ac.in', '9876543210', 'Indra Vihar', 'Kota', 'Rajasthan', 'India', '324005',
 3, 'active', 'annual', '2026-01-01', '2027-01-01', '2027-01-01',
 '22AAAAA0000A1Z5', 'AAAAA0000A', 'https://allen.ac.in/logo.png', '#0047AB', 'Asia/Kolkata', 'https://allen.ac.in', NULL, 'Premium customer',
 10.00, 179991.00, 18.00, 'INV-ALLEN-001', NULL, NULL, 50000, NULL, NULL, '500 GB', NULL, NULL, NULL),

(3, 'Aakash Institute', 'aakash', 'AAKASH', 'customer', 'active',
 'JC Chaudhry', 'owner@aakash.ac.in', '9876543211', 'Sector 11', 'Dwarka', 'Delhi', 'India', '110075',
 2, 'active', 'monthly', '2026-08-01', '2026-09-01', '2026-09-01',
 '07BBBBB1111B1Z6', 'BBBBB1111B', 'https://aakash.ac.in/logo.png', '#FF0000', 'Asia/Kolkata', 'https://aakash.ac.in', NULL, 'Standard customer',
 0.00, 4999.00, 18.00, 'INV-AAKASH-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

(4, 'FIITJEE', 'fiitjee', 'FIITJEE', 'customer', 'suspended',
 'DK Goel', 'owner@fiitjee.com', '9876543212', 'Kalu Sarai', 'New Delhi', 'Delhi', 'India', '110016',
 3, 'canceled', 'annual', '2025-01-01', '2026-01-01', '2026-01-01',
 '07CCCCC2222C1Z7', 'CCCCC2222C', 'https://fiitjee.com/logo.png', '#0000FF', 'Asia/Kolkata', 'https://fiitjee.com', NULL, 'Account suspended due to non-payment',
 0.00, 199990.00, 18.00, 'INV-FIITJEE-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

(5, 'Resonance', 'resonance', 'RESO', 'customer', 'draft',
 'RK Verma', 'owner@resonance.ac.in', '9876543213', 'CG Tower', 'Kota', 'Rajasthan', 'India', '324005',
 1, 'trialing', 'monthly', '2026-08-15', '2026-08-29', '2026-08-29',
 '22DDDDD3333D1Z8', 'DDDDD3333D', 'https://resonance.ac.in/logo.png', '#FFD700', 'Asia/Kolkata', 'https://resonance.ac.in', '2026-08-29', 'Trial period active',
 0.00, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

(6, 'Vibrant Academy', 'vibrant', 'VIBRANT', 'customer', 'active',
 'Nitin Jain', 'owner@vibrant.ac.in', '9876543214', 'Road No 2', 'Indraprastha Industrial Area', 'Rajasthan', 'India', '324005',
 2, 'active', 'annual', '2026-02-01', '2027-02-01', '2027-02-01',
 '22EEEEE4444E1Z9', 'EEEEE4444E', 'https://vibrant.ac.in/logo.png', '#800080', 'Asia/Kolkata', 'https://vibrant.ac.in', NULL, 'Upgraded from monthly to annual',
 5.00, 47490.50, 18.00, 'INV-VIBRANT-001', 10, 100, 5000, 10000, 200, '50 GB', '100 MB', 10000, 5000),

(7, 'Bansal Classes', 'bansal', 'BANSAL', 'customer', 'active',
 'VK Bansal', 'owner@bansal.ac.in', '9876543215', 'Gaurav Tower', 'Kota', 'Rajasthan', 'India', '324005',
 3, 'active', 'lifetime', '2020-01-01', '2099-01-01', '2099-01-01',
 '22FFFFF5555F1Z0', 'FFFFF5555F', 'https://bansal.ac.in/logo.png', '#008000', 'Asia/Kolkata', 'https://bansal.ac.in', NULL, 'Lifetime legacy partner',
 50.00, 99995.00, 18.00, 'INV-BANSAL-001', 100, 500, 100000, 200000, 1000, '1 TB', '500 MB', 500000, 100000),

(8, 'Physics Wallah', 'pw', 'PW', 'customer', 'active',
 'Alakh Pandey', 'owner@pw.live', '9876543216', 'Sector 62', 'Noida', 'Uttar Pradesh', 'India', '201309',
 3, 'active', 'monthly', '2026-08-01', '2026-09-01', '2026-09-01',
 '09GGGGG6666G1Z1', 'GGGGG6666G', 'https://pw.live/logo.png', '#000000', 'Asia/Kolkata', 'https://pw.live', NULL, 'High volume traffic tenant',
 0.00, 19999.00, 18.00, 'INV-PW-001', 500, 5000, 1000000, 2000000, 10000, '10 TB', '1 GB', 1000000, 500000),

(9, 'Unacademy', 'unacademy', 'UNACADEMY', 'customer', 'active',
 'Gaurav Munjal', 'owner@unacademy.com', '9876543217', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560034',
 3, 'active', 'annual', '2026-04-01', '2027-04-01', '2027-04-01',
 '29HHHHH7777H1Z2', 'HHHHH7777H', 'https://unacademy.com/logo.png', '#2E8B57', 'Asia/Kolkata', 'https://unacademy.com', NULL, 'Enterprise custom SLA',
 20.00, 159992.00, 18.00, 'INV-UNACADEMY-001', 200, 2000, 500000, 1000000, 5000, '5 TB', '1 GB', 500000, 250000),

(10, 'Vedantu', 'vedantu', 'VEDANTU', 'customer', 'suspended',
 'Vamsi Krishna', 'owner@vedantu.com', '9876543218', 'HSR Layout', 'Bengaluru', 'Karnataka', 'India', '560102',
 2, 'past_due', 'monthly', '2026-06-01', '2026-07-01', '2026-07-01',
 '29IIIII8888I1Z3', 'IIIII8888I', 'https://vedantu.com/logo.png', '#FFA500', 'Asia/Kolkata', 'https://vedantu.com', NULL, 'Payment failed last month',
 0.00, 4999.00, 18.00, 'INV-VEDANTU-001', 20, 150, 20000, 40000, 500, '100 GB', '100 MB', 20000, 10000);
