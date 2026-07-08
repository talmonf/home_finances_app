-- Personal-client agreed fee and default payment method; cash on treatment payment enum.

ALTER TYPE "therapy_treatment_payment_method" ADD VALUE IF NOT EXISTS 'cash';

ALTER TABLE "therapy_clients"
  ADD COLUMN IF NOT EXISTS "agreed_fee_amount" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "agreed_fee_currency" TEXT NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS "default_payment_method" "therapy_treatment_payment_method";
