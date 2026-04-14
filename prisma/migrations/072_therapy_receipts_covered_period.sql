ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "covered_period_start" DATE,
  ADD COLUMN IF NOT EXISTS "covered_period_end" DATE;

CREATE INDEX IF NOT EXISTS "idx_therapy_receipts_covered_period"
  ON "therapy_receipts" ("household_id", "covered_period_start", "covered_period_end");

