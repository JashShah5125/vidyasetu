-- Migration 136: Convert tenants.status column to TINYINT (0=inactive, 1=active, 2=draft, 3=deleted)

-- 1. Map existing string statuses
UPDATE tenants SET status = '3' WHERE status = 'deleted';
UPDATE tenants SET status = '1' WHERE status IN ('active', '1', 'Active');
UPDATE tenants SET status = '2' WHERE status IN ('draft', 'trialing', 'Draft');
UPDATE tenants SET status = '0' WHERE status IN ('inactive', 'suspended', 'canceled', 'expired', '0', 'Inactive', 'Suspended');
UPDATE tenants SET status = '1' WHERE status NOT IN ('0', '1', '2', '3');

-- 2. Alter column to TINYINT NOT NULL DEFAULT 1
ALTER TABLE tenants 
MODIFY COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active, 2=draft, 3=deleted';
