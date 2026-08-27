-- ============================================================================
-- 121_standardize_all_ids_to_int.sql
-- Standardizes ALL table IDs to INT AUTO_INCREMENT.
--
-- NOTE: The migrations originally used `id VARCHAR(36)` for ~90 tables and
-- declared FKs with inline `REFERENCES ...` clauses. MySQL silently ignored
-- those inline FK declarations, so almost no FK constraints actually exist in
-- the live DB (only 17 named FKs were created). This made the conversion safe:
-- only TWO tables had data (branches=1 row, user_branch_access=4 rows).
--
-- The single real FK that referenced a converting table (enquiries -> students,
-- named `fk_enquiries_student`) had to be dropped before conversion and
-- re-added after.
--
-- This migration has ALREADY been applied to the live DB. It is kept as the
-- reproducible record of that change. To re-run on a fresh DB, execute it in
-- this order. Because statement ordering matters and MySQL alters must be
-- idempotent-safe, this run via a Node driver rather than a naive `;` split is
-- recommended (see the backend runner notes).
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 0. Remap the single seeded branch from VARCHAR id to INT id 1, and remap the
--    branch_id references in user_roles / user_branch_access to match.
-- ---------------------------------------------------------------------------
UPDATE `branches` SET `id` = 1 WHERE `id` = 'b-allen-kota-hq';
UPDATE `user_roles` SET `branch_id` = 1 WHERE `branch_id` = 'b-allen-kota-hq';
UPDATE `user_branch_access` SET `branch_id` = 1 WHERE `branch_id` = 'b-allen-kota-hq';

-- ---------------------------------------------------------------------------
-- 1. Drop the only real FK referencing a table being converted (students).
-- ---------------------------------------------------------------------------
ALTER TABLE `enquiries` DROP FOREIGN KEY IF EXISTS `fk_enquiries_student`;

-- ---------------------------------------------------------------------------
-- 2. Convert every table's PRIMARY KEY id from VARCHAR(36) to INT AUTO_INCREMENT
-- ---------------------------------------------------------------------------
ALTER TABLE `branches`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `branch_settings`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `holidays`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `document_types`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `notification_templates` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `tenant_module_overrides` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `app_devices`          DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `user_sessions`        DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `otp_codes`            DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `password_resets`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `push_tokens`          DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `user_branch_access`   MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `overridden_permissions` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `boards`               DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `courses`              DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `programs`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `levels`               DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `subjects`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `level_subjects`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `classrooms`           DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `academic_years`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `batches`              DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `staff_profiles`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `teacher_availability` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `teacher_allocations`  DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `staff_attendance`     DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `leave_requests`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `enquiry_sources`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `enquiries`            DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `enquiry_followups`    DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `enquiry_status_logs`  DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `students`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `guardians`            DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `student_guardians`    DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `admissions`           DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `student_enrollments`  DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `batch_transfer_history` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `student_documents`    DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `recurring_schedule_rules` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `lectures`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `lecture_cancellations` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `schedule_change_logs` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `attendance_settings`  DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `attendance_sessions`  DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `attendance_records`   DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `attendance_correction_requests` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `assignments`          DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `assignment_files`     DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `assignment_submissions` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `assignment_submission_files` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `exams`                DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `exam_batch_assignments` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `exam_marks`           DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `exam_result_publish_logs` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `doubts`               DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `doubt_messages`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `doubt_attachments`    DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `fee_heads`            DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `fee_plans`            DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `fee_plan_items`       DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `fee_plan_installments` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `subject_bundles`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `bundle_subjects`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `concessions`          DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `student_fee_assignments` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `student_installments` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `receipts`             DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `payment_transactions` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `payment_installment_links` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `refunds`              DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `income_expense_heads` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `income_expense_ledger` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `ledger_approvals`     DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `salary_structures`    DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `salary_structure_components` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `payroll_periods`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `payroll_records`      DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `payroll_disbursements` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `notifications`        DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `notification_recipients` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `announcements`        DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `announcement_audiences` DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `broadcast_messages`   DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `communication_logs`   DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);
ALTER TABLE `audit_logs`           DROP PRIMARY KEY, MODIFY `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);

-- ---------------------------------------------------------------------------
-- 3. Convert all VARCHAR(36) FK columns to INT (they reference now-INT tables)
-- ---------------------------------------------------------------------------
ALTER TABLE `user_roles`          MODIFY `branch_id` INT DEFAULT NULL;
ALTER TABLE `user_branch_access`  MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `branch_settings`     MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `holidays`            MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `academic_years`      MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `batches`             MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `batches`             MODIFY `level_id` INT NOT NULL;
ALTER TABLE `staff_profiles`      MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `teacher_availability` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `teacher_allocations` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `teacher_allocations` MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `teacher_allocations` MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `staff_attendance`    MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `leave_requests`      MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `enquiries`           MODIFY `preferred_branch_id` INT NOT NULL;
ALTER TABLE `enquiries`           MODIFY `assigned_branch_id` INT NOT NULL;
ALTER TABLE `enquiries`           MODIFY `interested_course_id` INT DEFAULT NULL;
ALTER TABLE `enquiries`           MODIFY `interested_program_id` INT DEFAULT NULL;
ALTER TABLE `enquiries`           MODIFY `interested_level_id` INT DEFAULT NULL;
ALTER TABLE `enquiries`           MODIFY `converted_student_id` INT DEFAULT NULL;
ALTER TABLE `students`            MODIFY `primary_branch_id` INT NOT NULL;
ALTER TABLE `admissions`          MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `admissions`          MODIFY `student_id` INT NOT NULL;
ALTER TABLE `student_enrollments` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `student_enrollments` MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `student_enrollments` MODIFY `student_id` INT NOT NULL;
ALTER TABLE `recurring_schedule_rules` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `recurring_schedule_rules` MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `recurring_schedule_rules` MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `lectures`            MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `lectures`            MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `lectures`            MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `lecture_cancellations` MODIFY `lecture_id` INT NOT NULL;
ALTER TABLE `lecture_cancellations` MODIFY `compensatory_lecture_id` INT DEFAULT NULL;
ALTER TABLE `schedule_change_logs` MODIFY `lecture_id` INT NOT NULL;
ALTER TABLE `attendance_settings` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `attendance_sessions` MODIFY `lecture_id` INT NOT NULL;
ALTER TABLE `assignments`         MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `assignments`         MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `assignments`         MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `exams`               MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `exams`               MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `exam_batch_assignments` MODIFY `exam_id` INT NOT NULL;
ALTER TABLE `exam_batch_assignments` MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `exam_marks`          MODIFY `exam_id` INT NOT NULL;
ALTER TABLE `exam_result_publish_logs` MODIFY `exam_id` INT NOT NULL;
ALTER TABLE `doubts`              MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `fee_plans`           MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `fee_plans`           MODIFY `level_id` INT DEFAULT NULL;
ALTER TABLE `fee_plan_items`      MODIFY `fee_plan_id` INT NOT NULL;
ALTER TABLE `fee_plan_installments` MODIFY `fee_plan_id` INT NOT NULL;
ALTER TABLE `subject_bundles`     MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `subject_bundles`     MODIFY `fee_plan_id` INT DEFAULT NULL;
ALTER TABLE `bundle_subjects`     MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `concessions`         MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `student_fee_assignments` MODIFY `fee_plan_id` INT DEFAULT NULL;
ALTER TABLE `receipts`            MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `income_expense_ledger` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `payroll_periods`     MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `announcements`       MODIFY `branch_id` INT DEFAULT NULL;
ALTER TABLE `broadcast_messages`  MODIFY `batch_id` INT NOT NULL;
ALTER TABLE `student_guardians`   MODIFY `student_id` INT NOT NULL;
ALTER TABLE `student_documents`   MODIFY `student_id` INT NOT NULL;
ALTER TABLE `batch_transfer_history` MODIFY `student_id` INT NOT NULL;
ALTER TABLE `batch_transfer_history` MODIFY `from_batch_id` INT DEFAULT NULL;
ALTER TABLE `batch_transfer_history` MODIFY `to_batch_id` INT NOT NULL;
ALTER TABLE `programs`            MODIFY `course_id` INT NOT NULL;
ALTER TABLE `levels`              MODIFY `program_id` INT NOT NULL;
ALTER TABLE `level_subjects`      MODIFY `level_id` INT NOT NULL;
ALTER TABLE `level_subjects`      MODIFY `subject_id` INT NOT NULL;
ALTER TABLE `app_devices`         MODIFY `user_id` INT NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Convert secondary (non-PK) FK columns to INT
-- ---------------------------------------------------------------------------
ALTER TABLE `admissions` MODIFY `enquiry_id` INT DEFAULT NULL;
ALTER TABLE `announcement_audiences` MODIFY `announcement_id` INT NOT NULL;
ALTER TABLE `announcement_audiences` MODIFY `target_id` INT NOT NULL;
ALTER TABLE `assignment_files` MODIFY `assignment_id` INT NOT NULL;
ALTER TABLE `assignment_submission_files` MODIFY `submission_id` INT NOT NULL;
ALTER TABLE `assignment_submissions` MODIFY `assignment_id` INT NOT NULL;
ALTER TABLE `assignment_submissions` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `assignment_submissions` MODIFY `graded_by` INT DEFAULT NULL;
ALTER TABLE `assignments` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `attendance_correction_requests` MODIFY `approved_by` INT DEFAULT NULL;
ALTER TABLE `attendance_correction_requests` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `attendance_correction_requests` MODIFY `requested_by` INT NOT NULL;
ALTER TABLE `attendance_correction_requests` MODIFY `session_id` INT NOT NULL;
ALTER TABLE `attendance_records` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `attendance_records` MODIFY `session_id` INT NOT NULL;
ALTER TABLE `attendance_sessions` MODIFY `locked_by` INT DEFAULT NULL;
ALTER TABLE `attendance_sessions` MODIFY `submitted_by` INT DEFAULT NULL;
ALTER TABLE `batch_transfer_history` MODIFY `from_enrollment_id` INT DEFAULT NULL;
ALTER TABLE `batch_transfer_history` MODIFY `to_enrollment_id` INT NOT NULL;
ALTER TABLE `batches` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `bundle_subjects` MODIFY `bundle_id` INT NOT NULL;
ALTER TABLE `classrooms` MODIFY `branch_id` INT NOT NULL;
ALTER TABLE `concessions` MODIFY `approved_by` INT DEFAULT NULL;
ALTER TABLE `concessions` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `courses` MODIFY `board_id` INT DEFAULT NULL;
ALTER TABLE `doubt_attachments` MODIFY `message_id` INT NOT NULL;
ALTER TABLE `doubt_messages` MODIFY `doubt_id` INT NOT NULL;
ALTER TABLE `doubts` MODIFY `assigned_teacher_id` INT DEFAULT NULL;
ALTER TABLE `doubts` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `enquiries` MODIFY `counsellor_id` INT DEFAULT NULL;
ALTER TABLE `enquiries` MODIFY `source_id` INT DEFAULT NULL;
ALTER TABLE `enquiry_followups` MODIFY `enquiry_id` INT NOT NULL;
ALTER TABLE `enquiry_status_logs` MODIFY `enquiry_id` INT NOT NULL;
ALTER TABLE `exam_marks` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `exam_result_publish_logs` MODIFY `published_by` INT DEFAULT NULL;
ALTER TABLE `exams` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `fee_plan_items` MODIFY `fee_head_id` INT DEFAULT NULL;
ALTER TABLE `fee_plans` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `income_expense_ledger` MODIFY `head_id` INT NOT NULL;
ALTER TABLE `leave_requests` MODIFY `approved_by` INT DEFAULT NULL;
ALTER TABLE `leave_requests` MODIFY `staff_id` INT NOT NULL;
ALTER TABLE `lecture_cancellations` MODIFY `cancelled_by` INT DEFAULT NULL;
ALTER TABLE `lectures` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `lectures` MODIFY `classroom_id` INT DEFAULT NULL;
ALTER TABLE `lectures` MODIFY `recurring_rule_id` INT DEFAULT NULL;
ALTER TABLE `ledger_approvals` MODIFY `approved_by` INT DEFAULT NULL;
ALTER TABLE `ledger_approvals` MODIFY `ledger_id` INT NOT NULL;
ALTER TABLE `notification_recipients` MODIFY `notification_id` INT NOT NULL;
ALTER TABLE `overridden_permissions` MODIFY `permission_id` INT DEFAULT NULL;
ALTER TABLE `payment_installment_links` MODIFY `installment_id` INT NOT NULL;
ALTER TABLE `payment_installment_links` MODIFY `payment_id` INT NOT NULL;
ALTER TABLE `payment_transactions` MODIFY `receipt_id` INT DEFAULT NULL;
ALTER TABLE `payroll_disbursements` MODIFY `payroll_record_id` INT NOT NULL;
ALTER TABLE `payroll_periods` MODIFY `processed_by` INT DEFAULT NULL;
ALTER TABLE `payroll_records` MODIFY `period_id` INT NOT NULL;
ALTER TABLE `payroll_records` MODIFY `staff_id` INT NOT NULL;
ALTER TABLE `push_tokens` MODIFY `device_id` INT DEFAULT NULL;
ALTER TABLE `receipts` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `recurring_schedule_rules` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `recurring_schedule_rules` MODIFY `classroom_id` INT DEFAULT NULL;
ALTER TABLE `refunds` MODIFY `approved_by` INT DEFAULT NULL;
ALTER TABLE `refunds` MODIFY `receipt_id` INT DEFAULT NULL;
ALTER TABLE `salary_structure_components` MODIFY `structure_id` INT NOT NULL;
ALTER TABLE `schedule_change_logs` MODIFY `changed_by` INT DEFAULT NULL;
ALTER TABLE `staff_attendance` MODIFY `marked_by` INT DEFAULT NULL;
ALTER TABLE `staff_attendance` MODIFY `staff_id` INT NOT NULL;
ALTER TABLE `student_documents` MODIFY `document_type_id` INT DEFAULT NULL;
ALTER TABLE `student_documents` MODIFY `verified_by` INT DEFAULT NULL;
ALTER TABLE `student_enrollments` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `student_enrollments` MODIFY `promoted_from_enrollment_id` INT DEFAULT NULL;
ALTER TABLE `student_fee_assignments` MODIFY `enrollment_id` INT NOT NULL;
ALTER TABLE `student_guardians` MODIFY `guardian_id` INT NOT NULL;
ALTER TABLE `student_installments` MODIFY `fee_assignment_id` INT NOT NULL;
ALTER TABLE `students` MODIFY `board_id` INT DEFAULT NULL;
ALTER TABLE `teacher_allocations` MODIFY `academic_year_id` INT DEFAULT NULL;
ALTER TABLE `tenant_module_overrides` MODIFY `module_id` INT DEFAULT NULL;
ALTER TABLE `user_branch_access` MODIFY `granted_by` INT DEFAULT NULL;
ALTER TABLE `user_sessions` MODIFY `device_id` INT DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- 5. Re-add the enquiries -> students FK (both are INT now)
-- ---------------------------------------------------------------------------
ALTER TABLE `enquiries`
  ADD CONSTRAINT `fk_enquiries_student` FOREIGN KEY (`converted_student_id`) REFERENCES `students`(`id`);

SET FOREIGN_KEY_CHECKS = 1;
