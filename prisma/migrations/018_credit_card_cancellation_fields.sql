-- 018_credit_card_cancellation_fields.sql
-- Consolidated credit card migration:
-- - cancellation date support
-- - generic notes field
-- - required last 4 digits
-- - optional digital wallet identifier
-- - charge day of month
-- - monthly cost
-- - scheme/issuer/co-brand/product structure
--
-- Status is derived in the app as:
-- - Cancelled: cancelled_at is not null
-- - Expired: not cancelled and expiry_date is in the past
-- - Active: otherwise

ALTER TABLE "credit_cards"
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "website_url" TEXT,
  ADD COLUMN IF NOT EXISTS "monthly_cost" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "charge_day_of_month" INTEGER,
  ADD COLUMN IF NOT EXISTS "digital_wallet_identifier" TEXT,
  ADD COLUMN IF NOT EXISTS "co_brand" TEXT,
  ADD COLUMN IF NOT EXISTS "product_name" TEXT;

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

ALTER TABLE "digital_payment_methods"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT;

-- Allow credit cards without a settlement bank account.
ALTER TABLE "credit_cards"
  ALTER COLUMN "settlement_bank_account_id" DROP NOT NULL;

-- Keep charge day values in a valid month-day range.
UPDATE "credit_cards"
SET "charge_day_of_month" = NULL
WHERE "charge_day_of_month" < 1 OR "charge_day_of_month" > 31;

-- Ensure monthly_cost is optional even if it was created NOT NULL in an earlier iteration.
ALTER TABLE "credit_cards"
  ALTER COLUMN "monthly_cost" DROP NOT NULL,
  ALTER COLUMN "monthly_cost" DROP DEFAULT;

-- If old cancellation_notes exists, preserve data into notes then drop old column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_cards'
      AND column_name = 'cancellation_notes'
  ) THEN
    UPDATE "credit_cards"
    SET "notes" = COALESCE("notes", "cancellation_notes")
    WHERE "cancellation_notes" IS NOT NULL;

    ALTER TABLE "credit_cards" DROP COLUMN "cancellation_notes";
  END IF;
END $$;

-- Enforce mandatory last-4 digits for existing and new rows.
UPDATE "credit_cards"
SET "card_last_four" = '0000'
WHERE "card_last_four" IS NULL OR length(trim("card_last_four")) = 0;

ALTER TABLE "credit_cards"
  ALTER COLUMN "card_last_four" SET NOT NULL;

-- Add card scheme enum + required scheme field.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_scheme') THEN
    CREATE TYPE "card_scheme" AS ENUM ('visa', 'mastercard', 'amex', 'diners_club', 'isracard', 'other');
  END IF;
END $$;

ALTER TYPE "card_scheme" ADD VALUE IF NOT EXISTS 'diners_club';
ALTER TYPE "card_scheme" ADD VALUE IF NOT EXISTS 'isracard';

ALTER TABLE "credit_cards"
  ADD COLUMN IF NOT EXISTS "scheme" "card_scheme";

UPDATE "credit_cards"
SET "scheme" = 'other'::card_scheme
WHERE "scheme" IS NULL;

ALTER TABLE "credit_cards"
  ALTER COLUMN "scheme" SET NOT NULL;
