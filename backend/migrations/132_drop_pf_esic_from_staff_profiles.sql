-- Migration 132: Drop PF and ESIC columns from staff_profiles
ALTER TABLE staff_profiles
  DROP COLUMN IF EXISTS pf_account_number,
  DROP COLUMN IF EXISTS esic_account_number,
  DROP COLUMN IF EXISTS pf_applicable,
  DROP COLUMN IF EXISTS esic_applicable;
