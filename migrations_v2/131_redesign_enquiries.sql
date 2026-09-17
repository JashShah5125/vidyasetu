-- Redesign enquiries for the lead pipeline
-- status: TINYINT pipeline stage (0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=converted,-1=lost,-2=cancelled)
-- source: TINYINT (0=walk_in,1=phone,2=website,3=social_media,4=whatsapp,5=referral,6=campaign,7=google_ads,8=other)
-- Agreed fee plan stored directly on the enquiry (installment_amount auto-calculated)

-- Drop FK on source_id first, then the column (enquiries_ibfk_4 -> enquiry_sources)
ALTER TABLE enquiries
    DROP FOREIGN KEY enquiries_ibfk_4,
    DROP FOREIGN KEY enquiries_ibfk_7,
    DROP COLUMN source_id,
    DROP COLUMN interested_level_id,
    DROP COLUMN conversion_probability,
    MODIFY COLUMN status TINYINT NOT NULL DEFAULT 0 COMMENT '0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=converted,-1=lost,-2=cancelled',
    ADD COLUMN source TINYINT NOT NULL DEFAULT 0 COMMENT '0=walk_in,1=phone,2=website,3=social_media,4=whatsapp,5=referral,6=campaign,7=google_ads,8=other' AFTER assigned_branch_id,
    ADD COLUMN parent_email VARCHAR(255) NULL AFTER parent_mobile,
    ADD COLUMN interested_academic_year_id INT NULL AFTER interested_program_id,
    ADD CONSTRAINT fk_enquiries_academic_year FOREIGN KEY (interested_academic_year_id) REFERENCES academic_years(id),
    ADD COLUMN admission_confirmed_at DATETIME NULL AFTER next_followup_at,
    ADD COLUMN actual_price DECIMAL(12,2) NULL,
    ADD COLUMN concession_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN final_price DECIMAL(12,2) NULL,
    ADD COLUMN down_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN installment_months INT NOT NULL DEFAULT 1,
    ADD COLUMN counselling_notes TEXT NULL,
    ADD COLUMN lost_at DATETIME NULL;

-- installment_amount is auto-calculated: (final_price - down_payment) / installment_months
ALTER TABLE enquiries
    ADD COLUMN installment_amount DECIMAL(12,2) GENERATED ALWAYS AS ((final_price - down_payment) / installment_months) STORED AFTER installment_months;

-- enquiry_sources master table is now unused (source lives as tinyint on enquiries)
DROP TABLE IF EXISTS enquiry_sources;