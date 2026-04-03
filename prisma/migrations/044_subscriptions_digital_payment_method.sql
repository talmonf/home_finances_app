-- 044_subscriptions_digital_payment_method.sql
-- Optional digital wallet / app link on subscriptions (in addition to optional credit card).

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "digital_payment_method_id" UUID;

ALTER TABLE "subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_digital_payment_method_id_fkey",
  ADD CONSTRAINT "subscriptions_digital_payment_method_id_fkey"
    FOREIGN KEY ("digital_payment_method_id") REFERENCES "digital_payment_methods"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_subscriptions_digital_payment_method"
  ON "subscriptions" ("digital_payment_method_id");
