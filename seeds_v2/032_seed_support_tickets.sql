-- Seed: support_tickets + support_replies
-- Realistic support tickets for seeded customer tenants (mirrors the old mock UI).
-- Idempotent: INSERT IGNORE keyed on unique ticket_number / primary ids.
-- sender_id: users FK. 1 = Super Admin, 2 = Allen Admin, 103 = Aakash Dwarka Head.

-- Tickets
INSERT IGNORE INTO support_tickets (id, ticket_number, tenant_id, subject, description, status, created_by, created_at) VALUES
(1, 'TKT-1001', 2, 'Invoice billing cycle mismatch on renewal',
 'The annual renewal invoice for the Pro plan shows a monthly billing cycle. Our account team expects the annual amount with the 10% enterprise discount applied. Please verify.', 'In Progress', 2, '2026-08-24 10:15:00'),
(2, 'TKT-1002', 3, 'Mobile app login error after weekly maintenance',
 'Since the maintenance window last Saturday, all admin staff are getting "Invalid session" on the mobile app even after re-logging in. Works fine on web.', 'Open', NULL, '2026-08-26 09:40:00'),
(3, 'TKT-1003', 6, 'Custom fee split for repeaters batch',
 'We need a per-student fee split for our new repeaters batch: 60% payable at admission and 40% before the second semester. Can the fee module support a custom schedule?', 'Resolved', NULL, '2026-08-18 14:05:00'),
(4, 'TKT-1004', 9, 'Bulk student CSV upload validation failing',
 'Every bulk upload returns "row 12 malformed" even though the file matches the template. We suspect phone number formatting is the issue.', 'Open', NULL, '2026-08-29 11:22:00'),
(5, 'TKT-1005', 8, 'SMS gateway credit balance not updating',
 'We sent ~12k SMS last week but the gateway panel still shows the pre-send balance. Credits are not being deducted on our account overview.', 'Resolved', NULL, '2026-08-15 16:30:00');

-- Replies (first reply = requester description, then staff/tenant thread)
INSERT IGNORE INTO support_replies (id, ticket_id, sender_id, sender_role, is_from_staff, message, created_at) VALUES
-- TKT-1001 thread
(1, 1, 2, 'tenant', 0, 'The annual renewal invoice for the Pro plan shows a monthly billing cycle. Our account team expects the annual amount with the 10% enterprise discount applied. Please verify.', '2026-08-24 10:15:00'),
(2, 1, 1, 'staff', 1, 'Hi there - this looks like a stale plan reference on the invoice. I have corrected the cycle to annual and applied the 10% discount. A corrected invoice (INV-2026-0001) is in the payments section.', '2026-08-24 12:45:00'),
(3, 1, 2, 'tenant', 0, 'Confirmed on our end, the corrected invoice looks right now. Thanks for the quick turnaround.', '2026-08-25 09:00:00'),
(4, 1, 1, 'staff', 1, 'Great to hear. Keeping this ticket in progress while we push the same fix to your billing report email templates.', '2026-08-25 10:30:00'),

-- TKT-1002 thread
(5, 2, 103, 'tenant', 0, 'Since the maintenance window last Saturday, all admin staff are getting "Invalid session" on the mobile app even after re-logging in. Works fine on web.', '2026-08-26 09:40:00'),

-- TKT-1003 thread
(6, 3, NULL, 'tenant', 0, 'We need a per-student fee split for our new repeaters batch: 60% payable at admission and 40% before the second semester. Can the fee module support a custom schedule?', '2026-08-18 14:05:00'),
(7, 3, 1, 'staff', 1, 'Yes - the fee module supports custom installment schedules per batch. We have enabled the "custom installments" toggle for your tenant and attached a 2-installment split (60/40) template. You can edit it under Batch > Fee Plan.', '2026-08-19 11:20:00'),
(8, 3, NULL, 'tenant', 0, 'Works as expected, installment alert SMS go out correctly. Resolving from our side.', '2026-08-20 15:10:00'),

-- TKT-1004 thread
(9, 4, NULL, 'tenant', 0, 'Every bulk upload returns "row 12 malformed" even though the file matches the template. We suspect phone number formatting is the issue.', '2026-08-29 11:22:00'),
(10, 4, NULL, 'tenant', 0, 'Also seeing the same on row 47 now. Uploading the file again tonight.', '2026-08-30 19:00:00'),

-- TKT-1005 thread
(11, 5, NULL, 'tenant', 0, 'We sent ~12k SMS last week but the gateway panel still shows the pre-send balance. Credits are not being deducted on our account overview.', '2026-08-15 16:30:00'),
(12, 5, 1, 'staff', 1, 'The gateway balance was a cached value - the actual deduction happened but the overview was reading a stale snapshot. We have flushed the cache and the correct balance is now displayed.', '2026-08-16 10:00:00'),
(13, 5, NULL, 'tenant', 0, 'Confirmed, balance is now accurate. Thank you.', '2026-08-16 11:30:00');