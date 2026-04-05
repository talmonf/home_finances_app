-- Per-household calendar date display order (YMD = yyyy-MM-dd, DMY, MDY). Used for formatting and HTML lang hints.

DO $$
BEGIN
  CREATE TYPE household_date_display_format AS ENUM ('YMD', 'DMY', 'MDY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS date_display_format household_date_display_format NOT NULL DEFAULT 'YMD';
