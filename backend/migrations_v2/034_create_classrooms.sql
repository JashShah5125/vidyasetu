-- Final schema: classrooms
-- All IDs: INT AUTO_INCREMENT
-- Merged from: 031_create_classrooms.sql, 110_fix_database_schema_inconsistencies.sql
-- Change: added room_number VARCHAR(50)
CREATE TABLE classrooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    room_number VARCHAR(50),
    capacity INTEGER NOT NULL,
    type ENUM('classroom', 'lab', 'seminar_hall', 'computer_lab') NOT NULL DEFAULT 'classroom',
    status ENUM('active', 'inactive', 'under_maintenance', 'deleted') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT,
    UNIQUE(branch_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
