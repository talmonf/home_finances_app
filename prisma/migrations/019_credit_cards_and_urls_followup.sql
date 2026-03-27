-- 019_credit_cards_and_urls_followup.sql
-- Follow-up to 018 for databases where 018 was already executed earlier.
-- Adds later fields and reconciles nullable behavior for monthly_cost.

-- credit_cards additions
ALTER TABLE "credit_cards"
  ADD COLUMN IF NOT EXISTS "digital_wallet_identifier" TEXT,
  ADD COLUMN IF NOT EXISTS "charge_day_of_month" INTEGER,
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

-- Add website_url to other entities
ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

ALTER TABLE "digital_payment_methods"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

-- Extend card scheme enum with additional supported options.
ALTER TYPE "card_scheme" ADD VALUE IF NOT EXISTS 'diners_club';
ALTER TYPE "card_scheme" ADD VALUE IF NOT EXISTS 'isracard';

-- Allow credit cards without a settlement bank account (for DBs where 018 already ran).
ALTER TABLE "credit_cards"
  ALTER COLUMN "settlement_bank_account_id" DROP NOT NULL;
