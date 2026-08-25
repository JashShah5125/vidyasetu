-- Make email NOT NULL
ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL;

-- idx_users_email already exists as (tenant_id, email).
-- No additional index is required.
