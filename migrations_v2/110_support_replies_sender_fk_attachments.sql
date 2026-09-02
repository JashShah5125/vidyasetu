-- Migration 110: support_replies — sender becomes users FK + attachment columns
-- 1. Replaces free-text `sender` with `sender_id` FK -> users(id).
-- 2. Adds attachment columns storing the uploaded file URL + original name.

-- 1. New columns before backfill (sender still present)
ALTER TABLE support_replies
    ADD COLUMN sender_id INT NULL AFTER ticket_id,
    ADD COLUMN attachment_url VARCHAR(500) NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL;

-- 2. Backfill sender_id from historical sender name labels
UPDATE support_replies SET sender_id = 1
WHERE sender IN ('SaaS Support Staff', 'SaaS Admin', 'Super Admin');
UPDATE support_replies SET sender_id = 2 WHERE sender = 'Allen Admin';
UPDATE support_replies SET sender_id = 103 WHERE sender = 'Aakash Operator';

-- 3. Drop the free-text sender column (sender is now user id only)
ALTER TABLE support_replies DROP COLUMN sender;

-- 4. Foreign key + index
ALTER TABLE support_replies
    ADD CONSTRAINT fk_support_replies_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_support_replies_sender ON support_replies(sender_id);