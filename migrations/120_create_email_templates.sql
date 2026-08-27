CREATE TABLE IF NOT EXISTS email_templates (
    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    template_key VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,

    category ENUM(
        'AUTHENTICATION',
        'ONBOARDING',
        'TENANT',
        'SUBSCRIPTION'
    ) NOT NULL,

    subject VARCHAR(500) NOT NULL,

    html_body LONGTEXT NOT NULL,
    text_body LONGTEXT NULL,

    variables JSON NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    is_system TINYINT(1) NOT NULL DEFAULT 1,

    created_by INT NULL,
    updated_by INT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_email_templates_tenant_key
        (tenant_id, template_key),

    KEY idx_email_templates_category
        (category),

    KEY idx_email_templates_status
        (status),

    KEY idx_email_templates_system
        (is_system),

    KEY idx_email_templates_deleted_at
        (deleted_at),

    KEY idx_email_templates_created_by
        (created_by),

    KEY idx_email_templates_updated_by
        (updated_by),

    CONSTRAINT fk_email_templates_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id),

    CONSTRAINT fk_email_templates_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_email_templates_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;