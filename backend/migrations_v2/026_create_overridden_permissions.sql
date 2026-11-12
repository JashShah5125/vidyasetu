-- Final schema: overridden_permissions
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 098_create_overridden_permissions.sql
CREATE TABLE overridden_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    -- 'grant' adds the permission even if the role doesn't have it
    -- 'revoke' explicitly denies the permission even if the role has it
    override_type ENUM('grant', 'revoke') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    -- Ensure a user can only have one override per permission
    UNIQUE(user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
