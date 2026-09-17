-- Remove offer_accepted (7) status from the enquiries pipeline; renumber converted
-- New mapping: 0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=converted,-1=lost,-2=cancelled
UPDATE enquiries SET status = status - 1 WHERE status IN (8);
ALTER TABLE enquiries
    MODIFY COLUMN status TINYINT NOT NULL DEFAULT 0 COMMENT '0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=converted,-1=lost,-2=cancelled';