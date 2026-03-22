-- 014_digital_payment_methods.sql
-- Digital payment methods (Bit, PayBox, PayPal, Other) per household.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'digital_payment_method_type') THEN
    CREATE TYPE "digital_payment_method_type" AS ENUM (
      'bit',
      'paybox',
      'paypal',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "digital_payment_methods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "method_type" "digital_payment_method_type" NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "digital_payment_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_payment_methods_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_digital_payment_methods_household"
  ON "digital_payment_methods" ("household_id");
