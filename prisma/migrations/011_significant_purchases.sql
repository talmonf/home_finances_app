-- 011_significant_purchases.sql
-- Adds "significant purchases" with optional warranty expiry dates.
-- These items show up in Upcoming renewals as warranty expiries.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_category') THEN
    CREATE TYPE "purchase_category" AS ENUM (
      'electronics',
      'appliances',
      'tools',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'significant_purchase_source_type') THEN
    CREATE TYPE "significant_purchase_source_type" AS ENUM (
      'credit_card',
      'present',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "significant_purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "family_member_id" UUID,
  "credit_card_id" UUID,
  "purchase_date" TIMESTAMP(3) NOT NULL,
  "warranty_expiry_date" TIMESTAMP(3),
  "purchase_category" "purchase_category" NOT NULL,
  "purchase_source_type" "significant_purchase_source_type" NOT NULL,
  "item_name" TEXT NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "significant_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "significant_purchases_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "significant_purchases_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "significant_purchases_credit_card_id_fkey"
    FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_significant_purchases_household" ON "significant_purchases" ("household_id");
CREATE INDEX IF NOT EXISTS "idx_significant_purchases_warranty" ON "significant_purchases" ("household_id", "warranty_expiry_date");

-- Link transactions -> significant purchase (optional)
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "significant_purchase_id" UUID;

ALTER TABLE "transactions"
  DROP CONSTRAINT IF EXISTS "transactions_significant_purchase_id_fkey";

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_significant_purchase_id_fkey"
    FOREIGN KEY ("significant_purchase_id") REFERENCES "significant_purchases"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

