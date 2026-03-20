-- 013_bank_accounts_date_closed.sql
-- Adds optional "date_closed" field for inactive bank accounts.

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "date_closed" TIMESTAMP(3);

