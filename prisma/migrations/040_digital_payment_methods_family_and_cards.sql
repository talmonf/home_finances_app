-- 040_digital_payment_methods_family_and_cards.sql
-- Add optional family member, primary/secondary credit card links,
-- and an optional explicit created date for digital payment methods.

ALTER TABLE "digital_payment_methods"
  ADD COLUMN IF NOT EXISTS "family_member_id" UUID,
  ADD COLUMN IF NOT EXISTS "primary_credit_card_id" UUID,
  ADD COLUMN IF NOT EXISTS "secondary_credit_card_id" UUID,
  ADD COLUMN IF NOT EXISTS "date_created" TIMESTAMP(3);

ALTER TABLE "digital_payment_methods"
  DROP CONSTRAINT IF EXISTS "digital_payment_methods_family_member_id_fkey",
  ADD CONSTRAINT "digital_payment_methods_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_payment_methods"
  DROP CONSTRAINT IF EXISTS "digital_payment_methods_primary_credit_card_id_fkey",
  ADD CONSTRAINT "digital_payment_methods_primary_credit_card_id_fkey"
    FOREIGN KEY ("primary_credit_card_id") REFERENCES "credit_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_payment_methods"
  DROP CONSTRAINT IF EXISTS "digital_payment_methods_secondary_credit_card_id_fkey",
  ADD CONSTRAINT "digital_payment_methods_secondary_credit_card_id_fkey"
    FOREIGN KEY ("secondary_credit_card_id") REFERENCES "credit_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_digital_payment_methods_family_member"
  ON "digital_payment_methods" ("family_member_id");

CREATE INDEX IF NOT EXISTS "idx_digital_payment_methods_primary_credit_card"
  ON "digital_payment_methods" ("primary_credit_card_id");

CREATE INDEX IF NOT EXISTS "idx_digital_payment_methods_secondary_credit_card"
  ON "digital_payment_methods" ("secondary_credit_card_id");

