-- 012_bank_accounts_fields.sql
-- Adds optional bank-account metadata for easier identification.

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "branch_name" TEXT;

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "sort_code" VARCHAR(6);

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

