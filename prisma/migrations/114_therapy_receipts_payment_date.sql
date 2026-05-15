ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "payment_date" DATE;
