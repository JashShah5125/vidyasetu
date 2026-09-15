CREATE TABLE IF NOT EXISTS student_doubt_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doubt_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    message TEXT NULL,
    attachments JSON NULL COMMENT 'Array of relative file URLs e.g. ["/uploads/doubts/abc.jpg"]',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reply_doubt_created (doubt_id, created_at),
    INDEX idx_reply_doubt_read (doubt_id, is_read),
    CONSTRAINT fk_sdr_doubt FOREIGN KEY (doubt_id) REFERENCES student_doubts(id) ON DELETE CASCADE,
    CONSTRAINT fk_sdr_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
