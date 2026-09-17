-- Remove counselled (6) status from the enquiries pipeline; renumber fee_discussion/offer_accepted/converted
-- New mapping: 0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=offer_accepted,8=converted,-1=lost,-2=cancelled
UPDATE enquiries SET status = status - 1 WHERE status IN (7, 8, 9);
ALTER TABLE enquiries
    MODIFY COLUMN status TINYINT NOT NULL DEFAULT 0 COMMENT '0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=offer_accepted,8=converted,-1=lost,-2=cancelled';