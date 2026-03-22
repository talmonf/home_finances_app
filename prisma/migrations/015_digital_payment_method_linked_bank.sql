-- 015_digital_payment_method_linked_bank.sql
-- Optional funding/settlement bank account for each digital payment method (same household).

ALTER TABLE "digital_payment_methods"
  ADD COLUMN IF NOT EXISTS "linked_bank_account_id" UUID;

ALTER TABLE "digital_payment_methods"
  DROP CONSTRAINT IF EXISTS "digital_payment_methods_linked_bank_account_id_fkey";

ALTER TABLE "digital_payment_methods"
  ADD CONSTRAINT "digital_payment_methods_linked_bank_account_id_fkey"
  FOREIGN KEY ("linked_bank_account_id") REFERENCES "bank_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_digital_payment_methods_linked_bank"
  ON "digital_payment_methods" ("linked_bank_account_id");
