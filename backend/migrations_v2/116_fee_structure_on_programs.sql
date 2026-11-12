-- Fee structure stored directly on the academic tables.
-- 1. Program-wise (full course) fees live on `programs`.
-- 2. Bundle-wise fees live on `subject_bundles`.
-- 3. Subject-wise fees live on the new `subject_fees` table (level + subject).

-- 1. Add program-wise fee columns to programs.
ALTER TABLE programs
    ADD COLUMN total_fee DECIMAL(10,2) NULL AFTER duration,
    ADD COLUMN down_payment DECIMAL(10,2) NULL AFTER total_fee,
    ADD COLUMN installment_months INT NULL AFTER down_payment;

-- 2. Add bundle fee amount to subject_bundles.
ALTER TABLE subject_bundles
    ADD COLUMN fee_amount DECIMAL(10,2) NULL AFTER description;

-- 3. Create subject_fees: a fee amount per subject within a level.
CREATE TABLE subject_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    level_id INT NOT NULL,
    subject_id INT NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE KEY uq_subject_fees_level_subject (level_id, subject_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
);