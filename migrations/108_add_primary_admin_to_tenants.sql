ALTER TABLE tenants ADD COLUMN primary_admin_user_id INT;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_primary_admin FOREIGN KEY (primary_admin_user_id) REFERENCES users(id) ON DELETE SET NULL;
