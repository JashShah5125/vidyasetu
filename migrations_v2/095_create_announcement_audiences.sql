-- Final schema: announcement_audiences
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 093_create_announcement_audiences.sql
CREATE TABLE announcement_audiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    announcement_id INT NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);
