-- 131_widen_saas_lead_followup_outcome.sql
-- Widen the follow-up outcome column; VARCHAR(50) was too small for real outcome notes.
ALTER TABLE saas_lead_followups
    MODIFY COLUMN outcome VARCHAR(255) NOT NULL;