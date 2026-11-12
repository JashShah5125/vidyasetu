-- Migration 133: Drop emergency contact columns from staff_profiles
ALTER TABLE staff_profiles
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_number;
