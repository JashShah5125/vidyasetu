-- The old global unique index does not exist in this database.
-- Keep the existing tenant + code index.

-- Add a generated column that contains the code only for system roles.
ALTER TABLE roles
ADD COLUMN system_code_unique VARCHAR(100)
GENERATED ALWAYS AS (
    IF(tenant_id IS NULL, code, NULL)
) STORED;

-- System-role codes must be unique.
-- Tenant-specific roles have NULL in this column and therefore
-- can share the same code.
CREATE UNIQUE INDEX idx_roles_code_unique_when_null
ON roles (system_code_unique);

