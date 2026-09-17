-- Link concessions to enquiries so pre-conversion discounts roll into fee assignment
ALTER TABLE concessions
    MODIFY COLUMN enrollment_id INT NULL,
    ADD COLUMN enquiry_id INT NULL,
    ADD CONSTRAINT fk_concessions_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL;