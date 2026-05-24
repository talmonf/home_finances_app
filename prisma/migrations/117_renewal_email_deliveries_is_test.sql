-- Distinguish manual test sends from cron-triggered digest deliveries.

ALTER TABLE renewal_email_deliveries
  ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT FALSE;
