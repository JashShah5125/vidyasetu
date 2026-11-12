-- Migration: Update student_documents status to TINYINT and seed default document_types
-- 0=verification_pending, 1=verified, 2=rejected

ALTER TABLE `student_documents` 
CHANGE `status` `status` TINYINT NOT NULL DEFAULT 0 
COMMENT '0=verification_pending, 1=verified, 2=rejected';

INSERT INTO `document_types` (`id`, `name`, `code`, `is_required`) VALUES
(1, 'Student Photo', 'student_photo', 1),
(2, 'ID Proof (Aadhar)', 'aadhaar_card', 1),
(3, 'Previous Marksheet', 'previous_marksheet', 1),
(4, 'Transfer Certificate', 'transfer_certificate', 0),
(5, 'Other Document', 'other', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `is_required` = VALUES(`is_required`);
