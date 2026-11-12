-- Extend enquiry_status_logs to also track counsellor/branch reassignment
ALTER TABLE enquiry_status_logs
    ADD COLUMN to_user_id INT NULL,
    ADD COLUMN to_branch_id INT NULL,
    ADD COLUMN notes TEXT NULL,
    ADD CONSTRAINT fk_esl_to_user FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_esl_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE SET NULL;