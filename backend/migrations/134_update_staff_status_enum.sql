-- Migration 134: Update staff_profiles and users status column to ENUM with 'active', 'inactive', 'deleted'
ALTER TABLE staff_profiles MODIFY COLUMN status ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active';
ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'deleted') NOT NULL DEFAULT 'active';
