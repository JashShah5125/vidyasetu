-- Final schema: user_roles
-- All IDs: INT AUTO_INCREMENT
-- Flat RBAC: a user_roles row is a pure user -> role mapping, scoped to nothing else.
-- Per-user permission exceptions live in overridden_permissions.
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    revoked_at DATETIME,
    UNIQUE KEY uq_user_roles (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);
