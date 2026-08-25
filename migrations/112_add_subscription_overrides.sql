-- Up
ALTER TABLE tenants
ADD COLUMN subscription_discount DECIMAL(5,2) DEFAULT NULL AFTER subscription_notes,
ADD COLUMN subscription_final_price DECIMAL(10,2) DEFAULT NULL AFTER subscription_discount,
ADD COLUMN subscription_tax DECIMAL(5,2) DEFAULT NULL AFTER subscription_final_price,
ADD COLUMN subscription_invoice_number VARCHAR(100) DEFAULT NULL AFTER subscription_tax,
ADD COLUMN override_max_branches INT DEFAULT NULL AFTER subscription_invoice_number,
ADD COLUMN override_max_staff_users INT DEFAULT NULL AFTER override_max_branches,
ADD COLUMN override_max_students INT DEFAULT NULL AFTER override_max_staff_users,
ADD COLUMN override_max_parents INT DEFAULT NULL AFTER override_max_students,
ADD COLUMN override_max_teachers INT DEFAULT NULL AFTER override_max_parents,
ADD COLUMN override_max_storage VARCHAR(50) DEFAULT NULL AFTER override_max_teachers,
ADD COLUMN override_max_file_size VARCHAR(50) DEFAULT NULL AFTER override_max_storage,
ADD COLUMN override_max_sms_credits INT DEFAULT NULL AFTER override_max_file_size,
ADD COLUMN override_max_whatsapp_msgs INT DEFAULT NULL AFTER override_max_sms_credits;

-- Down
ALTER TABLE tenants
DROP COLUMN subscription_discount,
DROP COLUMN subscription_final_price,
DROP COLUMN subscription_tax,
DROP COLUMN subscription_invoice_number,
DROP COLUMN override_max_branches,
DROP COLUMN override_max_staff_users,
DROP COLUMN override_max_students,
DROP COLUMN override_max_parents,
DROP COLUMN override_max_teachers,
DROP COLUMN override_max_storage,
DROP COLUMN override_max_file_size,
DROP COLUMN override_max_sms_credits,
DROP COLUMN override_max_whatsapp_msgs;
