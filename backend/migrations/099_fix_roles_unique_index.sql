-- Drop the globally unique index on code
DROP INDEX idx_roles_system_code ON roles;

-- Add a new unique index that treats NULL tenant_id distinctly using a functional index
CREATE UNIQUE INDEX idx_roles_code_unique_when_null ON roles ((IF(tenant_id IS NULL, code, NULL)));
