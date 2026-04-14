-- Optional payment metadata per treatment (date, method, bank account or digital wallet).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_treatment_payment_method') THEN
    CREATE TYPE "therapy_treatment_payment_method" AS ENUM ('bank_transfer', 'digital_payment');
  END IF;
END $$;

ALTER TABLE "therapy_treatments"
  ADD COLUMN IF NOT EXISTS "payment_date" DATE,
  ADD COLUMN IF NOT EXISTS "payment_method" "therapy_treatment_payment_method",
  ADD COLUMN IF NOT EXISTS "payment_bank_account_id" UUID,
  ADD COLUMN IF NOT EXISTS "payment_digital_payment_method_id" UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_payment_bank_account_id_fkey'
  ) THEN
    ALTER TABLE "therapy_treatments"
      ADD CONSTRAINT "therapy_treatments_payment_bank_account_id_fkey"
      FOREIGN KEY ("payment_bank_account_id") REFERENCES "bank_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_payment_digital_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "therapy_treatments"
      ADD CONSTRAINT "therapy_treatments_payment_digital_payment_method_id_fkey"
      FOREIGN KEY ("payment_digital_payment_method_id") REFERENCES "digital_payment_methods"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_therapy_treatments_payment_bank_account_id"
  ON "therapy_treatments" ("payment_bank_account_id");

CREATE INDEX IF NOT EXISTS "idx_therapy_treatments_payment_digital_payment_method_id"
  ON "therapy_treatments" ("payment_digital_payment_method_id");
