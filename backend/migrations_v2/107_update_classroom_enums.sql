-- Make classrooms.type and status true ENUMs with the full set of valid values.
-- Display values from the frontend are normalized to these tokens in the model.
ALTER TABLE classrooms
    MODIFY COLUMN type ENUM('classroom', 'lab', 'seminar_hall', 'computer_lab') NOT NULL DEFAULT 'classroom';

ALTER TABLE classrooms
    MODIFY COLUMN status ENUM('active', 'inactive', 'under_maintenance', 'deleted') NOT NULL DEFAULT 'active';