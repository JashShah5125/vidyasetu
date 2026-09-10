-- ============================================================
-- 124: Lecture Schedule Requests
-- Teachers submit requests, Branch/Inst admins approve/reject,
-- then admin applies the approved request to the timetable.
-- ============================================================

CREATE TABLE IF NOT EXISTS `lecture_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `branch_id` INT NOT NULL,
    `requester_id` INT NOT NULL,

    -- Linked lecture (NULL for NEW_LECTURE requests)
    `lecture_id` INT,
    `batch_id` INT NOT NULL,
    `subject_id` INT NOT NULL,

    `request_type` ENUM(
        'RESCHEDULE',
        'ROOM_CHANGE',
        'TEACHER_CHANGE',
        'CANCEL',
        'NEW_LECTURE'
    ) NOT NULL,

    -- Snapshot of what is currently scheduled
    `current_date` DATE,
    `current_start_time` TIME,
    `current_end_time` TIME,
    `current_classroom_id` INT,
    `current_teacher_user_id` INT,

    -- What the teacher wants instead
    `requested_date` DATE,
    `requested_start_time` TIME,
    `requested_end_time` TIME,
    `requested_classroom_id` INT,
    `requested_teacher_user_id` INT,

    `reason` TEXT,

    `status` ENUM('pending', 'approved', 'rejected', 'cancelled', 'applied') DEFAULT 'pending',

    `decided_by` INT,
    `decision_note` TEXT,
    `decided_at` DATETIME,

    `applied_by` INT,
    `applied_at` DATETIME,

    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`lecture_id`) REFERENCES `lectures`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`),
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`),
    FOREIGN KEY (`current_classroom_id`) REFERENCES `classrooms`(`id`),
    FOREIGN KEY (`current_teacher_user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`requested_classroom_id`) REFERENCES `classrooms`(`id`),
    FOREIGN KEY (`requested_teacher_user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`applied_by`) REFERENCES `users`(`id`),

    INDEX `idx_tenant_branch` (`tenant_id`, `branch_id`),
    INDEX `idx_branch_status` (`branch_id`, `status`),
    INDEX `idx_requester` (`requester_id`),
    INDEX `idx_lecture` (`lecture_id`),
    INDEX `idx_status` (`status`)
);
