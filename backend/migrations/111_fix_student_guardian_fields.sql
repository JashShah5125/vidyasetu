-- Fix student table fields (address and attempt year)
ALTER TABLE students
ADD COLUMN street VARCHAR(255) AFTER email,
ADD COLUMN pincode VARCHAR(20) AFTER state,
ADD COLUMN year_of_attempt VARCHAR(20) AFTER target_exam;

-- Fix guardians table fields (combine names)
ALTER TABLE guardians
ADD COLUMN full_name VARCHAR(255) NOT NULL AFTER user_id;

-- Try to migrate existing data before dropping
UPDATE guardians 
SET full_name = CONCAT_WS(' ', first_name, last_name);

ALTER TABLE guardians
DROP COLUMN first_name,
DROP COLUMN last_name;
