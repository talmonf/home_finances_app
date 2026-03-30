-- 030_subscriptions_monthly_day_of_month.sql
-- Subscriptions: add monthly_day_of_month for monthly renewal tracking.
--
-- Idempotent: safe to re-run.

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "monthly_day_of_month" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_monthly_day_of_month_check'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_monthly_day_of_month_check"
      CHECK (
        "monthly_day_of_month" IS NULL
        OR ("monthly_day_of_month" >= 1 AND "monthly_day_of_month" <= 31)
      );
  END IF;
END $$;

