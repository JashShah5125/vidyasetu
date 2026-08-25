CREATE TABLE overridden_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id VARCHAR(36) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- 'grant' adds the permission even if the role doesn't have it
    -- 'revoke' explicitly denies the permission even if the role has it
    override_type ENUM('grant', 'revoke') NOT NULL, 
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    
    -- Ensure a user can only have one override per permission
    UNIQUE(user_id, permission_id)
);
