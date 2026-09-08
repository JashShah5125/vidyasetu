-- Migration: Add working_days JSON column to staff_profiles
-- Description: Stores staff weekly working days as a JSON array of day strings (e.g. ["Monday", "Tuesday", ...])

ALTER TABLE staff_profiles 
ADD COLUMN working_days JSON NULL DEFAULT NULL AFTER max_lectures_per_week;
