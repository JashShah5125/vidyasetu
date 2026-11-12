-- Admissions post-conversion pipeline: status -> tinyint stage codes, academic/enrollment links, mode + stage timestamps
-- status: 0=registration_pending,1=documents_submitted,2=verification_pending,3=batch_allocation,4=active,-1=withdrawn,-2=cancelled
ALTER TABLE admissions
    MODIFY COLUMN status TINYINT NOT NULL DEFAULT 0 COMMENT '0=registration_pending,1=documents_submitted,2=verification_pending,3=batch_allocation,4=active,-1=withdrawn,-2=cancelled',
    ADD COLUMN academic_year_id INT NULL,
    ADD COLUMN enrollment_id INT NULL,
    ADD COLUMN admission_mode ENUM('walk_in','online','staff_assisted','self_registration') NULL,
    ADD COLUMN registration_completed_at DATETIME NULL,
    ADD COLUMN documents_verified_at DATETIME NULL,
    ADD COLUMN batch_allocated_at DATETIME NULL,
    ADD COLUMN activated_at DATETIME NULL,
    ADD COLUMN withdrawn_at DATETIME NULL,
    ADD CONSTRAINT fk_admissions_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    ADD CONSTRAINT fk_admissions_enrollment FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;