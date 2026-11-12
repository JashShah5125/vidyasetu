-- Add level scoping and uniqueness constraints to subject bundles.
-- A bundle belongs to a single level and is composed only of subjects
-- already mapped to that level (validated at the application layer).

-- 1. Add level_id to subject_bundles (scopes every bundle to one level).
ALTER TABLE subject_bundles
    ADD COLUMN level_id INT NULL AFTER branch_id,
    ADD KEY idx_subject_bundles_level (level_id),
    ADD CONSTRAINT fk_subject_bundles_level FOREIGN KEY (level_id) REFERENCES levels(id)
        ON DELETE RESTRICT;

-- 3. Enforce a unique friendly name per level.
ALTER TABLE subject_bundles
    ADD UNIQUE KEY uq_subject_bundles_level_name (level_id, name);

-- 4. Prevent duplicate subjects within a bundle.
ALTER TABLE bundle_subjects
    ADD UNIQUE KEY uq_bundle_subjects (bundle_id, subject_id);