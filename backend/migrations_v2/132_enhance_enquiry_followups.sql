-- Strip enquiry_followups to a minimal follow-up call log: what happened + when next
ALTER TABLE enquiry_followups
    DROP COLUMN followup_mode,
    DROP COLUMN outcome;