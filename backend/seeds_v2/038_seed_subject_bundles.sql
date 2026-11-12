-- Seed subject_bundles: one "All Subjects" bundle per level plus common
-- subject combinations (PCM, PCB, PCMB, Foundation, Humanities, etc.).
-- Combos are created only for levels whose level_subjects contain every
-- required subject (matched by subject code). Idempotent via INSERT IGNORE
-- + the unique key uq_subject_bundles_level_name (level_id, name).
-- Branch used = tenant's first active branch.
-- Applies to: OFFICE

-- 1. "All Subjects" bundle for every level (all subjects mapped to that level)
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'All Subjects',
    'All subjects mapped to this level',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL;

-- 2. PCM = Physics + Chemistry + Mathematics
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'PCM',
    'Physics, Chemistry and Mathematics',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('PHY-101','CHEM-101','MATH-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'PHY-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'CHEM-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL);

-- 3. PCM with English = Physics + Chemistry + Mathematics + English
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'PCM with English',
    'Physics, Chemistry, Mathematics and English',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('PHY-101','CHEM-101','MATH-101','ENG-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'PHY-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'CHEM-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'ENG-101' AND s.deleted_at IS NULL);

-- 4. PCB = Physics + Chemistry + Biology
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'PCB',
    'Physics, Chemistry and Biology',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('PHY-101','CHEM-101','BIO-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'PHY-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'CHEM-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'BIO-101' AND s.deleted_at IS NULL);

-- 5. PCMB = Physics + Chemistry + Mathematics + Biology
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'PCMB',
    'Physics, Chemistry, Mathematics and Biology',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('PHY-101','CHEM-101','MATH-101','BIO-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'PHY-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'CHEM-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'BIO-101' AND s.deleted_at IS NULL);

-- 6. Science & Maths = Science + Mathematics
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'Science & Maths',
    'Science and Mathematics',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('SCI-010','MATH-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'SCI-010' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL);

-- 7. Foundation Core = Science + Mathematics + Social Studies + English
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'Foundation Core',
    'Science, Mathematics, Social Studies and English',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('SCI-010','MATH-101','SST-010','ENG-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'SCI-010' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'SST-010' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'ENG-101' AND s.deleted_at IS NULL);

-- 8. Humanities = English + Hindi + Social Studies
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'Humanities',
    'English, Hindi and Social Studies',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('ENG-101','HIN-101','SST-010')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'ENG-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'HIN-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'SST-010' AND s.deleted_at IS NULL);

-- 9. Computer Science = English + Computer Science + Mathematics
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'Computer Science',
    'English, Computer Science and Mathematics',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('ENG-101','CS-101','MATH-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'ENG-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'CS-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'MATH-101' AND s.deleted_at IS NULL);

-- 10. English & Hindi = language combo
INSERT IGNORE INTO subject_bundles (tenant_id, branch_id, level_id, name, description, subject_ids, is_active, created_by, updated_by)
SELECT
    l.tenant_id,
    (SELECT b.id FROM branches b WHERE b.tenant_id = l.tenant_id AND b.deleted_at IS NULL ORDER BY b.id LIMIT 1),
    l.id,
    'English & Hindi',
    'English and Hindi language subjects',
    (SELECT JSON_ARRAYAGG(s.id)
     FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id
     WHERE ls.level_id = l.id AND s.deleted_at IS NULL AND s.code IN ('ENG-101','HIN-101')),
    1, 1, 1
FROM levels l
WHERE l.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'ENG-101' AND s.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM level_subjects ls JOIN subjects s ON s.id = ls.subject_id WHERE ls.level_id = l.id AND s.code = 'HIN-101' AND s.deleted_at IS NULL);