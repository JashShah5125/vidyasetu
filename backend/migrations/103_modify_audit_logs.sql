-- Modify audit_logs
ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(36);
ALTER TABLE audit_logs ADD COLUMN severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info';
ALTER TABLE audit_logs ADD COLUMN endpoint VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN request_method VARCHAR(10);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
