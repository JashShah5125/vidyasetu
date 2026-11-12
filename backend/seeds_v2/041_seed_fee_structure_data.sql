-- Seed for fee structure data (program fees, bundle fees, subject-wise fees)
-- Target tenant: Allen Career Institute (tenant_id = 2)
-- Idempotent: program fees via targeted UPDATE; bundle/subject fees derived
-- from the program totals so all tiers stay consistent.

-- 1. Program-wise (Full Course) fees
UPDATE programs SET total_fee = 150000, down_payment = 30000, installment_months = 12, updated_by = 2 WHERE id = 1 AND tenant_id = 2; -- JEE 2 Year (PRG-001)
UPDATE programs SET total_fee = 110000, down_payment = 25000, installment_months = 10, updated_by = 2 WHERE id = 2 AND tenant_id = 2; -- JEE 1 Year (PRG-002)
UPDATE programs SET total_fee =  45000, down_payment = 10000, installment_months =  3, updated_by = 2 WHERE id = 3 AND tenant_id = 2; -- JEE Crash Course (PRG-003)
UPDATE programs SET total_fee = 120000, down_payment = 25000, installment_months = 10, updated_by = 2 WHERE id = 4 AND tenant_id = 2; -- NEET 1 Year (PRG-004)
UPDATE programs SET total_fee = 100000, down_payment = 20000, installment_months = 10, updated_by = 2 WHERE id = 5 AND tenant_id = 2; -- NEET Repeater (PRG-005)
UPDATE programs SET total_fee =  90000, down_payment = 20000, installment_months = 12, updated_by = 2 WHERE id = 6 AND tenant_id = 2; -- Foundation 2 Year (PRG-006)
UPDATE programs SET total_fee =  50000, down_payment = 10000, installment_months = 10, updated_by = 2 WHERE id = 7 AND tenant_id = 2; -- Foundation 1 Year (PRG-007)
UPDATE programs SET total_fee =  30000, down_payment =  5000, installment_months =  6, updated_by = 2 WHERE id = 8 AND tenant_id = 2; -- 8th std ICSE (PRG-008)
UPDATE programs SET total_fee =  28000, down_payment =  5000, installment_months =  6, updated_by = 2 WHERE id = 9 AND tenant_id = 2; -- 8th std CBSE (PRG-009)

-- 2. Bundle-wise fees: proportional to subjects included vs the level's full set
-- (All Subjects bundle = full program fee; smaller combos = proportional share).
UPDATE subject_bundles sb
JOIN levels l ON l.id = sb.level_id
JOIN programs p ON p.id = l.program_id
JOIN (SELECT level_id, COUNT(*) AS cnt FROM level_subjects WHERE tenant_id = 2 GROUP BY level_id) ls
  ON ls.level_id = sb.level_id
SET sb.fee_amount = ROUND(p.total_fee * COALESCE(JSON_LENGTH(sb.subject_ids), 0) / ls.cnt, 0),
    sb.updated_by = 2
WHERE sb.tenant_id = 2
  AND sb.deleted_at IS NULL
  AND l.deleted_at IS NULL
  AND p.total_fee IS NOT NULL
  AND COALESCE(JSON_LENGTH(sb.subject_ids), 0) > 0;

-- 3. Subject-wise fees: 70% of the program fee split evenly across its subjects
INSERT INTO subject_fees (tenant_id, level_id, subject_id, fee_amount, created_by, updated_by)
SELECT l.tenant_id, ls.level_id, ls.subject_id,
       ROUND(p.total_fee * 0.7 / ls_cnt.cnt, 0) AS fee_amount,
       2, 2
FROM level_subjects ls
JOIN levels l ON l.id = ls.level_id AND l.tenant_id = 2 AND l.deleted_at IS NULL
JOIN programs p ON p.id = l.program_id AND p.total_fee IS NOT NULL
JOIN (SELECT level_id, COUNT(*) AS cnt FROM level_subjects WHERE tenant_id = 2 GROUP BY level_id) ls_cnt
  ON ls_cnt.level_id = ls.level_id
WHERE ls.tenant_id = 2
ON DUPLICATE KEY UPDATE
    fee_amount = VALUES(fee_amount),
    updated_by = VALUES(updated_by),
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL;