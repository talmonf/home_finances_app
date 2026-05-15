-- 116_jobs_start_date_nullable.sql
-- Allow jobs without a start date (optional on clinic job forms).

ALTER TABLE jobs
  ALTER COLUMN start_date DROP NOT NULL;
