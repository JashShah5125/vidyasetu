-- Seed for courses table
-- Target tenant: Allen Career Institute (tenant_id = 2)

INSERT IGNORE INTO courses (id, tenant_id, name, code, description, is_active, created_by, updated_by) VALUES
(1, 2, 'JEE Prep Course', 'JEE-PREP', 'Two year comprehensive course for JEE Advanced', 1, 2, 2),
(2, 2, 'NEET Batch Premium', 'NEET-PREM', 'One year premium batch for NEET', 1, 2, 2),
(3, 2, 'Class 10 Foundation', 'FOUND-10', 'Foundation course for Class 10 students', 1, 2, 2),
(4, 2, '8th Standard', '8TH-STD', 'Standard 8 foundation course', 1, 2, 2);
