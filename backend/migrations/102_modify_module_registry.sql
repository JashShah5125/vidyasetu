-- Modify module_registry
ALTER TABLE module_registry ADD COLUMN description TEXT;
ALTER TABLE module_registry ADD COLUMN version VARCHAR(50);
ALTER TABLE module_registry ADD COLUMN category VARCHAR(100);

ALTER TABLE module_registry MODIFY default_state ENUM('enabled', 'beta', 'deprecated', 'coming_soon', 'hidden') NOT NULL DEFAULT 'enabled';
