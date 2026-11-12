-- Final schema: user_branch_access
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 024_create_user_branch_access.sql
CREATE TABLE user_branch_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    branch_id INT NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    revoked_at DATETIME,
    UNIQUE(user_id, branch_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);
