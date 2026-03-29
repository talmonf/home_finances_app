-- 020_subscriptions_optional_dates_currency_family_member.sql
-- Run after 019 if 019 is already applied. Do not fold this into 019 once 019 has been run.
-- Subscriptions: optional start_date/renewal_date, currency, optional family_member_id (UUID FK).
--
-- Idempotent: safe to re-run. If a previous attempt added family_member_id as TEXT, it is cast to UUID.

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_family_member_id_fkey";

ALTER TABLE "subscriptions"
  ALTER COLUMN "start_date" DROP NOT NULL,
  ALTER COLUMN "renewal_date" DROP NOT NULL;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ILS';

-- Prefer UUID (matches family_members.id and credit_card_id per 002). ADD skips if column exists (any type).
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "family_member_id" UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'family_member_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "subscriptions"
      ALTER COLUMN "family_member_id" TYPE UUID USING (
        CASE
          WHEN "family_member_id" IS NULL THEN NULL
          WHEN btrim("family_member_id"::text) = '' THEN NULL
          ELSE ("family_member_id"::text)::uuid
        END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_family_member_id_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_family_member_id_fkey"
      FOREIGN KEY ("family_member_id") REFERENCES "family_members" ("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
