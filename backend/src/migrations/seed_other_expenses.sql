DELETE FROM branch_other_expenses WHERE tenant_id = 2;

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00001', 'Monthly Office Cleaning Services', 'Maintenance', 'Contract cleaning for Mumbai West campus - September 2026. Includes deep cleaning of 4 classrooms, 2 labs, and common areas.', 12500.00, '2026-09-01', 2, 'bank_transfer', 'NEFT-CLEAN-982145', 'CleanPro Services Pvt Ltd', JSON_ARRAY('uploads/expenses/oex-00001-invoice.pdf'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00002', 'Printer Cartridges & Toner Refill', 'Office Supplies', 'Bulk purchase of HP 305A toner cartridges (Qty: 5) and Canon CLI-281 ink cartridges (Qty: 8) for reception and staff rooms.', 8750.00, '2026-09-03', 2, 'upi', 'UPI/847291/SETU', 'TechStore Mumbai', JSON_ARRAY('uploads/expenses/oex-00002-receipt.jpg', 'uploads/expenses/oex-00002-bill.pdf'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00003', 'Emergency Plumbing Repair - Lab 2', 'Emergency', 'Urgent plumbing repair for science lab 2 water leak. Pipe replacement and waterproofing done by licensed contractor.', 18500.00, '2026-09-05', 2, 'cash', NULL, 'Rajesh Plumbing Works', JSON_ARRAY(), 102);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00004', 'Staff Team Building Outing', 'Events', 'Monthly team building event at Adventure Island for 25 staff members. Includes entry passes, transport, and lunch.', 45000.00, '2026-09-08', 1, 'bank_transfer', 'NEFT-EVENT-334781', 'Adventure Island Resort', JSON_ARRAY('uploads/expenses/oex-00004-booking.pdf', 'uploads/expenses/oex-00004-attendee-list.xlsx'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00005', 'AC Servicing - All Classrooms', 'Maintenance', 'Quarterly AC servicing for 12 split units and 3 central AC systems. Includes gas top-up for 4 units.', 22000.00, '2026-09-10', 0, 'cheque', 'CHQ-88421', 'CoolAir Technicians', JSON_ARRAY(), 102);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 1, 'OEX-2026-00006', 'Internet Bandwidth Upgrade', 'Communication', 'Upgraded branch internet from 100 Mbps to 200 Mbps plan with Airtel Business. Monthly recurring cost increase.', 6500.00, '2026-09-12', 2, 'bank_transfer', 'NEFT-AIRTEL-771234', 'Airtel Business', JSON_ARRAY('uploads/expenses/oex-00006-contract.pdf'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00007', 'Stationery Bulk Order - Q3', 'Office Supplies', 'Quarterly stationery restock: 200 notebooks, 500 pens, 50 files, 30 whiteboard markers, staplers, and tape dispensers.', 15800.00, '2026-09-02', 2, 'bank_transfer', 'NEFT-STAT-445612', 'Pune Stationery Mart', JSON_ARRAY('uploads/expenses/oex-00007-invoice.pdf', 'uploads/expenses/oex-00007-items.xlsx'), 102);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00008', 'Generator Diesel Refill', 'Miscellaneous', 'Emergency diesel refill for backup generator. 200 litres at Rs.92/litre. Used during 3 power outages this month.', 18400.00, '2026-09-04', 2, 'cash', NULL, 'HP Fuel Station Camp', JSON_ARRAY('uploads/expenses/oex-00008-fuel-receipt.jpg'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00009', 'Student Counselling Workshop', 'Events', 'Guest speaker workshop on career counselling for Class 11 & 12 students. Speaker fee, refreshments, and print materials.', 35000.00, '2026-09-06', 3, 'bank_transfer', 'NEFT-GUEST-998321', 'Prof. Meera Kulkarni', JSON_ARRAY('uploads/expenses/oex-00009-speaker-contract.pdf', 'uploads/expenses/oex-00009-expense-report.pdf'), 102);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00010', 'CCTV Camera Installation', 'Maintenance', 'Installation of 4 additional CCTV cameras at rear entrance and parking area. Includes 1TB DVR and wiring.', 32000.00, '2026-09-07', 1, 'bank_transfer', 'NEFT-CCTV-556789', 'SecureView Solutions', JSON_ARRAY('uploads/expenses/oex-00010-quotation.pdf', 'uploads/expenses/oex-00010-installation-report.pdf'), 101);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00011', 'Staff Travel Reimbursement - Conference', 'Travel', 'Reimbursement for 2 staff members attending NEET Coaching Summit in Delhi. Includes flight tickets, hotel, and local conveyance.', 28500.00, '2026-09-09', 0, 'bank_transfer', 'NEFT-TRAVEL-112456', 'Internal Reimbursement', JSON_ARRAY('uploads/expenses/oex-00011-flight-tickets.pdf', 'uploads/expenses/oex-00011-hotel-bill.pdf', 'uploads/expenses/oex-00011-conveyance.pdf'), 102);

INSERT INTO branch_other_expenses (tenant_id, branch_id, expense_record_number, title, category, description, amount, expense_date, status, payment_mode, reference_number, payee, attachment_urls, created_by) VALUES
(2, 2, 'OEX-2026-00012', 'Water Tanker Supply - September', 'Miscellaneous', 'Monthly water tanker supply for Pune Camp campus. 3 tanker deliveries of 5000 litres each.', 9000.00, '2026-09-11', 2, 'cash', NULL, 'Jai Jalaram Water Supply', JSON_ARRAY(), 101);
