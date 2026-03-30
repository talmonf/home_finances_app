-- 029_subscriptions_cancelled_at.sql
-- Subscriptions: add cancelled_at for Cancelled status
--
-- Idempotent: safe to re-run. (If column already exists, no changes.)

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

