-- How an insurance premium was paid: bank transfer or credit card, which account or card,
-- the payment date, and the credit-card installment count.

DO $$
BEGIN
  CREATE TYPE "insurance_payment_method" AS ENUM ('bank_account', 'credit_card');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "payment_method" "insurance_payment_method";

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "credit_card_id" UUID;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "payment_date" TIMESTAMP(3);

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "payment_count" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_policies_bank_account_id_fkey'
  ) THEN
    ALTER TABLE "insurance_policies"
      ADD CONSTRAINT "insurance_policies_bank_account_id_fkey"
      FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_policies_credit_card_id_fkey'
  ) THEN
    ALTER TABLE "insurance_policies"
      ADD CONSTRAINT "insurance_policies_credit_card_id_fkey"
      FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "insurance_policies_bank_account_id_idx"
  ON "insurance_policies" ("bank_account_id");

CREATE INDEX IF NOT EXISTS "insurance_policies_credit_card_id_idx"
  ON "insurance_policies" ("credit_card_id");
