-- Migration: Update students table status codes for Phases 3, 4, 5 of Admission Workflow
-- 0=inactive, 1=active, 2=deleted, 3=reg_pending, 4=docs_submitted, 5=docs_verified, 6=pending_batch, 7=batch_allocated, 8=payment_pending, 9=on_hold, 10=passed_out

ALTER TABLE `students` 
CHANGE `status` `status` TINYINT NOT NULL DEFAULT 3 
COMMENT '0=inactive, 1=active, 2=deleted, 3=reg_pending, 4=docs_submitted, 5=docs_verified, 6=pending_batch, 7=batch_allocated, 8=payment_pending, 9=on_hold, 10=passed_out';
