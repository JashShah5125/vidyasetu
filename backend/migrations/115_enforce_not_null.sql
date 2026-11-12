UPDATE tenants SET owner_name = 'Unknown' WHERE owner_name IS NULL;
UPDATE tenants SET primary_email = 'unknown@example.com' WHERE primary_email IS NULL;
ALTER TABLE tenants MODIFY owner_name VARCHAR(255) NOT NULL;
ALTER TABLE tenants MODIFY primary_email VARCHAR(255) NOT NULL;
