-- Merge bundle_subjects into subject_bundles as a JSON array of subject ids.
-- subject_bundles.subject_ids e.g. [3,7,9]
-- Applies to: OFFICE

-- 1. Add subject_ids JSON column
ALTER TABLE subject_bundles
    ADD COLUMN subject_ids JSON NULL AFTER description;

-- 2. Backfill existing bundle_subjects data
UPDATE subject_bundles sb
LEFT JOIN (
    SELECT bundle_id, JSON_ARRAYAGG(subject_id) AS ids
    FROM bundle_subjects
    GROUP BY bundle_id
) bs ON bs.bundle_id = sb.id
SET sb.subject_ids = COALESCE(bs.ids, JSON_ARRAY());

-- 3. Drop the now-redundant junction table (removes uq_bundle_subjects as well)
DROP TABLE bundle_subjects;