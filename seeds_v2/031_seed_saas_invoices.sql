-- Seed: saas_invoices (unified payment/invoice records)
-- Generates realistic invoice data derived from existing tenants & their subscriptions.
-- Idempotent: uses INSERT IGNORE keyed on unique invoice_number.

INSERT IGNORE INTO saas_invoices (
    invoice_number, tenant_id, plan_id, billing_cycle,
    billing_period_start, billing_period_end,
    plan_amount, setup_fee, discount_percent, discount_amount, subtotal,
    tax_rate, tax_amount, total_amount, currency,
    payment_date, payment_method, provider_transaction_id, payment_reference, status,
    notes, created_by
) VALUES
-- ============ ALLEN (tenant 2) — Pro / annual / active / 10% off ============
-- Pro annual = 199990, discount 10% (19999) -> 179991, tax 18% = 32398.38, total 212389.38
('INV-2026-0001', 2, 3, 'yearly', '2026-01-01', '2027-01-01',
 199990.00, 0.00, 10.00, 19999.00, 179991.00,
 18.00, 32398.38, 212389.38, 'INR',
 '2026-01-02', 'Razorpay', 'pay_Allen231124', 'rzp_allen_annual_2026', 'paid',
 'Annual Pro subscription for 2026-2027. 10% enterprise discount.', 1),

-- ============ AAKASH (tenant 3) — Growth / monthly / active / no discount ============
-- Growth monthly = 4999, tax 18% = 899.82, total 5898.82 (period Aug 15 - Sep 15)
('INV-2026-0002', 3, 2, 'monthly', '2026-08-15', '2026-09-15',
 4999.00, 0.00, 0.00, 0.00, 4999.00,
 18.00, 899.82, 5898.82, 'INR',
 '2026-08-16', 'UPI', 'upi_aakash_0816', 'aakash@upi', 'paid',
 'Monthly Growth subscription Aug-Sep 2026.', 1),

-- ============ RESONANCE (tenant 5) — Starter / monthly / trialing (draft) ============
-- Starter trial = 0, no charges yet (period Aug 25 - Sep 08, trial)
('INV-2026-0003', 5, 1, 'monthly', '2026-08-25', '2026-09-08',
 0.00, 0.00, 0.00, 0.00, 0.00,
 0.00, 0.00, 0.00, 'INR',
 NULL, NULL, NULL, NULL, 'draft',
 'Starter trial period. No charges until conversion on 2026-09-08.', 1),

-- ============ VIBRANT (tenant 6) — Growth / annual / active / 5% off ============
-- Growth annual = 49990, discount 5% (2499.50) -> 47490.50, tax 18% = 8548.29, total 56038.79
('INV-2026-0004', 6, 2, 'yearly', '2026-02-01', '2027-02-01',
 49990.00, 0.00, 5.00, 2499.50, 47490.50,
 18.00, 8548.29, 56038.79, 'INR',
 '2026-02-02', 'Razorpay', 'pay_vibrant_0202', 'rzp_vibrant_annual', 'paid',
 'Annual Growth subscription Feb 2026 - Feb 2027. 5% promotional discount.', 1),

-- ============ BANSAL (tenant 7) — Pro / lifetime / active / 50% off ============
-- Lifetime base 199990, discount 50% (99995) -> 99995, tax 18% = 17999.10, total 117994.10
('INV-2026-0005', 7, 3, 'lifetime', '2026-03-01', '2099-12-31',
 199990.00, 0.00, 50.00, 99995.00, 99995.00,
 18.00, 17999.10, 117994.10, 'INR',
 '2026-03-01', 'Bank Transfer', NULL, 'NEFT-BANSAL-0301', 'paid',
 'Lifetime Pro legacy partner. 50% founder discount, one-time payment.', 1),

-- ============ PHYSICS WALLAH (tenant 8) — Pro / monthly / active / no discount ============
-- Pro monthly = 19999, tax 18% = 3599.82, total 23598.82 (period Sep 1 - Oct 1)
('INV-2026-0006', 8, 3, 'monthly', '2026-09-01', '2026-10-01',
 19999.00, 0.00, 0.00, 0.00, 19999.00,
 18.00, 3599.82, 23598.82, 'INR',
 '2026-09-01', 'Razorpay', 'pay_pw_0901', 'rzp_pw_sep_2026', 'paid',
 'Monthly Pro subscription Sep-Oct 2026. High-volume tenant.', 1),

-- ============ UNACADEMY (tenant 9) — Pro / annual / active / 20% off ============
-- Pro annual = 199990, discount 20% (39998) -> 159992, tax 18% = 28798.56, total 188790.56
('INV-2026-0007', 9, 3, 'yearly', '2026-04-01', '2027-04-01',
 199990.00, 0.00, 20.00, 39998.00, 159992.00,
 18.00, 28798.56, 188790.56, 'INR',
 '2026-04-01', 'Razorpay', 'pay_unacademy_0401', 'rzp_unacademy_annual', 'paid',
 'Annual Pro subscription Apr 2026 - Apr 2027. Enterprise custom SLA, 20% discount.', 1),

-- ============ VEDANTU (tenant 10) — Growth / monthly / suspended (past_due) ============
-- June invoice paid
('INV-2026-0008', 10, 2, 'monthly', '2026-06-01', '2026-07-01',
 4999.00, 0.00, 0.00, 0.00, 4999.00,
 18.00, 899.82, 5898.82, 'INR',
 '2026-06-02', 'Razorpay', 'pay_vedantu_0602', 'rzp_vedantu_jun_2026', 'paid',
 'Monthly Growth subscription Jun-Jul 2026.', 1),

-- July invoice -> overdue (the triggering non-payment)
('INV-2026-0009', 10, 2, 'monthly', '2026-07-01', '2026-08-01',
 4999.00, 0.00, 0.00, 0.00, 4999.00,
 18.00, 899.82, 5898.82, 'INR',
 NULL, 'Razorpay', NULL, NULL, 'overdue',
 'Monthly Growth subscription Jul-Aug 2026. Payment failed; account suspended.', 1),

-- ============ FIITJEE (tenant 4) — Pro / annual / suspended (canceled) ============
-- Pro annual = 199990, tax 18% = 35998.20, total 235988.20 (period Jan 2025 - Jan 2026)
('INV-2025-0001', 4, 3, 'yearly', '2025-01-01', '2026-01-01',
 199990.00, 0.00, 0.00, 0.00, 199990.00,
 18.00, 35998.20, 235988.20, 'INR',
 NULL, 'Bank Transfer', NULL, 'NEFT-FIITJEE-0001', 'overdue',
 'Annual Pro subscription 2025-2026. Never paid after renewal; account suspended.', 1);
