-- 020_subscriptions_optional_dates_currency_family_member.sql
-- Subscriptions: optional start/renewal dates, fee currency, optional linked family member.

ALTER TABLE "subscriptions"
  ALTER COLUMN "start_date" DROP NOT NULL,
  ALTER COLUMN "renewal_date" DROP NOT NULL;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ILS';

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "family_member_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_family_member_id_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_family_member_id_fkey"
      FOREIGN KEY ("family_member_id") REFERENCES "family_members" ("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
