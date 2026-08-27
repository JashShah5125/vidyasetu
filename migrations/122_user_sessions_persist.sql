-- ============================================================================
-- 122_user_sessions_persist.sql
-- Makes user_sessions the authoritative persistent session store.
--
-- Changes:
--   * ADD session_id VARCHAR(64) UNIQUE NOT NULL - a non-sequential id carried
--     in the refresh token's JWT claims. It also keys the Redis fast-cache
--     (session:<sessionId>). The auto-increment `id` remains internal-only.
--   * ADD real FK user_id -> users(id) ON DELETE CASCADE. (No FK on device_id;
--     device info is stored directly as user_agent / ip_address strings.)
--   * The table keeps soft-revoke semantics via revoked_at (active session =
--     revoked_at IS NULL AND expires_at > NOW()).
--
-- Note: `id`, `user_id`, `tenant_id`, `device_id` are already INT from
-- migration 121. This migration is written to be idempotent-ish but is
-- primarily a reproducible record of the change applied to the live DB.
-- ============================================================================

ALTER TABLE `user_sessions`
    ADD COLUMN `session_id` VARCHAR(64) NOT NULL AFTER `id`;

ALTER TABLE `user_sessions`
    ADD UNIQUE INDEX `uq_sessions_session_id` (`session_id`);

ALTER TABLE `user_sessions`
    ADD CONSTRAINT `fk_sessions_user`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
