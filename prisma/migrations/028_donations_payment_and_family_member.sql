-- Donations: required family member + payment method & payment instrument linkage.
-- Note: family_member_id is added as nullable to avoid breaking existing donation rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_payment_method') THEN
    CREATE TYPE "donation_payment_method" AS ENUM (
      'cash',
      'credit_card',
      'bank_account',
      'digital_wallet',
      'other'
    );
  END IF;
END $$;

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "family_member_id" UUID;

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "payment_method" "donation_payment_method" NOT NULL DEFAULT 'cash';

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "credit_card_id" UUID;

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "digital_payment_method_id" UUID;

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_family_member_id_fkey",
  ADD CONSTRAINT "donations_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_credit_card_id_fkey",
  ADD CONSTRAINT "donations_credit_card_id_fkey"
    FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_bank_account_id_fkey",
  ADD CONSTRAINT "donations_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_digital_payment_method_id_fkey",
  ADD CONSTRAINT "donations_digital_payment_method_id_fkey"
    FOREIGN KEY ("digital_payment_method_id") REFERENCES "digital_payment_methods"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

