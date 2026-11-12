-- Add a 'deleted' status to branches.status so soft-deleted branches carry an
-- explicit status distinct from 'inactive'. The column was previously VARCHAR(20);
-- this converts it to an ENUM with the full set of valid statuses.
ALTER TABLE branches
    MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'deleted') NOT NULL DEFAULT 'active';