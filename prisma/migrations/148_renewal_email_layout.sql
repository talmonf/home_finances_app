-- Per-user layout for the upcoming renewals digest: grouped headings or one date-ordered list.

DO $$
BEGIN
  CREATE TYPE renewal_email_layout AS ENUM ('grouped', 'flat');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE renewal_email_subscriptions
  ADD COLUMN IF NOT EXISTS layout renewal_email_layout NOT NULL DEFAULT 'grouped';
