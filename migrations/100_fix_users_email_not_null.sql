-- Make email NOT NULL
ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL;

-- Ensure an index on email exists for faster auth lookups
CREATE INDEX idx_users_email ON users(email);
