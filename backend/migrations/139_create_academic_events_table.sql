-- Migration 139: Create academic_events table and seed initial institute events
CREATE TABLE IF NOT EXISTS academic_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NULL,
    academic_year_id INT NULL,
    title VARCHAR(255) NOT NULL,
    event_type ENUM('EXAM', 'HOLIDAY', 'MEETING', 'EVENT') NOT NULL DEFAULT 'EVENT',
    start_date DATE NOT NULL,
    end_date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    description TEXT NULL,
    venue VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_academic_events_tenant (tenant_id),
    INDEX idx_academic_events_branch (branch_id),
    INDEX idx_academic_events_dates (start_date, end_date)
);

-- Seed initial events for existing tenants (e.g. tenant 2 Allen Career Institute)
INSERT INTO academic_events (tenant_id, branch_id, title, event_type, start_date, end_date, description, venue)
SELECT t.id, NULL, 'Term 1 Mid-Term Assessment Week', 'EXAM', '2026-09-21', '2026-09-26', 'Mid-term practicals and theory evaluations for Foundation & Senior Batches.', 'All Branches'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM academic_events ae WHERE ae.tenant_id = t.id AND ae.title = 'Term 1 Mid-Term Assessment Week'
);

INSERT INTO academic_events (tenant_id, branch_id, title, event_type, start_date, end_date, description, venue)
SELECT t.id, NULL, 'Gandhi Jayanti (Holiday)', 'HOLIDAY', '2026-10-02', '2026-10-02', 'National holiday. No lectures scheduled.', 'All Branches'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM academic_events ae WHERE ae.tenant_id = t.id AND ae.title = 'Gandhi Jayanti (Holiday)'
);

INSERT INTO academic_events (tenant_id, branch_id, title, event_type, start_date, end_date, description, venue)
SELECT t.id, NULL, 'Parent-Teacher Interaction Meet (PTM)', 'MEETING', '2026-10-10', '2026-10-10', 'Bi-monthly academic review with guardians and faculty members.', 'Main Auditorium / Online'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM academic_events ae WHERE ae.tenant_id = t.id AND ae.title = 'Parent-Teacher Interaction Meet (PTM)'
);
