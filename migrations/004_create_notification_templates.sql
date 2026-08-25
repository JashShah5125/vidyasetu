CREATE TABLE notification_templates (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL UNIQUE,
    channel VARCHAR(20) NOT NULL,
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);
